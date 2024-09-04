import { CreateSupportIssue, SupportIssueReason, SupportIssueType, useApi, useSupport } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

// --- API INTERFACES / ENUMS --- // TODO: Add to packages and import from there

export enum SupportIssueState {
  CREATED = 'Created',
  PENDING = 'Pending',
  COMPLETED = 'Completed',
}

export interface BlobContent {
  data: any;
  contentType: string;
}

export interface SupportMessageDto {
  id: number;
  author: string;
  created: Date;
  message: string;
  fileUrl?: string;
}

export interface SupportIssueDto {
  id: number;
  state: SupportIssueState;
  type: SupportIssueType;
  reason: SupportIssueReason;
  name: string;
  created: Date;
  messages: SupportMessageDto[];
  information?: string;
  transaction?: any; // TODO: Define
  limitRequest?: any; // TODO: Define
}

// --- FRONTEND INTERFACES --- //

export interface SupportMessage extends SupportMessageDto {
  file?: DataFile;
  status?: 'sent' | 'received' | 'failed';
  replyTo?: number;
  reactions?: Reaction[];
}

export interface SupportIssue extends SupportIssueDto {
  messages: SupportMessage[];
}

export interface DataFile {
  file: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Reaction {
  emoji: string;
  users: string[];
}

// --- CONTEXT PROVIDER --- //

interface SupportChatInterface {
  supportIssue?: SupportIssue;
  isLoading: boolean;
  isError?: string;
  preFetch: (type: SupportIssueType) => Promise<void>;
  createSupportIssue: (request: CreateSupportIssue) => Promise<void>;
  submitMessage: (message: string, files: DataFile[], replyToMessage?: SupportMessage) => Promise<void>;
  handleEmojiClick: (messageId: number, emoji: string) => void;
  loadFileData: (messageId: number, fileUrl: string) => Promise<void>;
}

const SupportChat = createContext<SupportChatInterface>(undefined as any);

export const useSupportChat = () => useContext(SupportChat);

export function SupportChatProvider(props: PropsWithChildren): JSX.Element {
  const { call } = useApi();
  const { createIssue } = useSupport();

  const [supportIssue, setSupportIssue] = useState<SupportIssue>();
  const [unsettledMessages, setUnsettledMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isError, setIsError] = useState<string>();

  useEffect(() => {
    if (!supportIssue) return;
    const interval = setTimeout(() => fetchLatestMessages(), 10000);
    return () => clearInterval(interval);
  }, [supportIssue]);

  async function preFetch(type: SupportIssueType): Promise<void> {
    setIsLoading(true);
    setIsError(undefined);

    fetchSupportIssue({ issueType: type })
      .then((response) => setSupportIssue(response))
      .catch(() => setIsError('Error while fetching support issue'))
      .finally(() => setIsLoading(false));
  }

  async function fetchLatestMessages(): Promise<void> {
    if (!supportIssue || isLoading || isSyncing) return;

    setIsSyncing(true);
    const fromMessageId = supportIssue.messages[supportIssue.messages.length - 1].id;
    fetchSupportIssue({ issueId: supportIssue.id, fromMessageId })
      .then((response) => updateSupportIssue(response))
      .catch(() => setIsError('Error while fetching support messages'))
      .finally(() => setIsSyncing(false));
  }

  async function createSupportIssue(request: CreateSupportIssue): Promise<void> {
    const file = request.file
      ? // TODO: refactor out mapping of file, fileName to DataFile
        {
          file: request.file,
          name: request.fileName || '',
          type: request.fileName?.split('.').pop() || '',
          size: 0,
          url: 'NO URL',
        }
      : undefined;

    setUnsettledMessages((messages) => {
      messages.push({
        id: -1,
        author: 'Customer',
        message: request.message,
        file: file,
        created: new Date(),
        status: 'sent',
      });
      return [...messages];
    });

    await createIssue(request);
  }

  async function submitMessage(message: string, files: DataFile[], replyToMessage?: SupportMessage): Promise<void> {
    if (!supportIssue) return;

    const hasText = message.trim() !== '';
    const numFiles = files.length;

    if (!hasText && numFiles === 0) return;

    const modFiles = numFiles !== 1 && hasText ? [...files, undefined] : files;
    modFiles.forEach((file: DataFile | undefined, index) => {
      const messageId = -unsettledMessages.length - 1;

      const newMessage: SupportMessage = {
        id: messageId,
        author: 'Customer',
        created: new Date(),
        message: index === modFiles.length - 1 ? message : '',
        // TODO: Use spread operator for file
        file: file && {
          file: file.file,
          name: file.name,
          type: file.type,
          size: file.size,
          url: file.url,
        },
        replyTo: index === 0 ? replyToMessage?.id : undefined,
        status: 'sent',
      };

      setUnsettledMessages((messages) => {
        messages.push(newMessage);
        return [...messages];
      });

      createSupportMessage(supportIssue.id, newMessage)
        .then((response) => settleMessage(messageId, response))
        .catch(() => settleMessage(messageId));
    });
  }

  async function loadFileData(messageId: number, fileUrl: string): Promise<void> {
    const fileName = fileUrl.split('/').pop();
    if (!fileName) return;

    return fetchFileData(fileName).then((blobContent) => {
      const newFile = mapBlobContentToDataFile(fileName, blobContent);
      setSupportIssue((supportIssue) => {
        if (!supportIssue) return supportIssue;
        const message = supportIssue.messages.find((m) => m.id === messageId);
        if (message) message.file = newFile;
        return { ...supportIssue };
      });
    });
  }

  function handleEmojiClick(messageId: number, emoji: string) {
    if (!supportIssue) return;

    const messageIndex = supportIssue.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const message = supportIssue.messages[messageIndex];
    if (!message.reactions) message.reactions = [];
    const reactionIndex = message.reactions?.findIndex((r) => r.emoji === emoji);
    if (reactionIndex === -1) {
      message.reactions.push({ emoji, users: ['Customer'] });
    } else {
      const userIndex = message.reactions[reactionIndex].users.indexOf('Customer');
      if (userIndex === -1) {
        message.reactions[reactionIndex].users.push('Customer');
      } else {
        message.reactions[reactionIndex].users.splice(userIndex, 1);
        if (message.reactions[reactionIndex].users.length === 0) {
          message.reactions.splice(reactionIndex, 1);
        }
      }
    }

    setSupportIssue((supportIssue) => {
      if (!supportIssue) return supportIssue;
      supportIssue.messages[messageIndex] = message;
      return { ...supportIssue };
    });

    // TODO (later): Update message on server side. Feature not yet available.
  }

  const context = useMemo(
    () => ({
      supportIssue: supportIssue && {
        ...supportIssue,
        messages: [...supportIssue.messages, ...unsettledMessages],
      },
      isLoading,
      isError,
      preFetch,
      createSupportIssue,
      submitMessage,
      handleEmojiClick,
      loadFileData,
    }),
    [supportIssue, unsettledMessages, isLoading, isError, call],
  );

  // --- HELPER FUNCTIONS --- //

  function updateSupportIssue(newState: SupportIssue) {
    setSupportIssue((supportIssue) => {
      if (!supportIssue) return newState;
      supportIssue.messages = [...supportIssue.messages, ...newState.messages];
      return { ...supportIssue };
    });
  }

  function settleMessage(messageId: number, newMessage?: SupportMessage) {
    const idx = unsettledMessages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    const settledMessage = unsettledMessages[idx];

    setUnsettledMessages((messages) => {
      if (newMessage) messages.splice(idx, 1);
      else messages[idx].status = 'failed';
      return [...messages];
    });

    if (!newMessage) return;
    setSupportIssue((supportIssue) => {
      if (!supportIssue) return supportIssue;
      supportIssue.messages.push({ ...settledMessage, ...newMessage, status: 'received' });
      return { ...supportIssue };
    });
  }

  function isMessageEqual(a: SupportMessage, b: SupportMessage): boolean {
    return a.author === b.author && a.message === b.message;
  }

  function mapBlobContentToDataFile(fileName: string, blobContent: BlobContent): DataFile {
    const byteArray = new Uint8Array(blobContent.data.data);
    const blob = new Blob([byteArray], { type: blobContent.contentType });

    return {
      file: blobContent.data.data,
      name: fileName,
      type: blobContent.contentType,
      size: blob.size,
      url: URL.createObjectURL(blob),
    };
  }

  // --- API FUNCTIONS --- //

  async function createSupportMessage(issueId: number, newMessage: SupportMessage): Promise<SupportMessage> {
    return call<SupportMessage>({
      url: `support/issue/${issueId}/message`,
      method: 'POST',
      data: {
        author: newMessage.author,
        message: newMessage.message,
        file: newMessage.file && newMessage.file.file,
        fileName: newMessage.file && newMessage.file.name,
      },
    });
  }

  async function fetchSupportIssue({
    issueId,
    issueType,
    fromMessageId,
  }: {
    issueId?: number;
    issueType?: SupportIssueType;
    fromMessageId?: number;
  }): Promise<SupportIssue> {
    const params = new URLSearchParams();
    if (issueId) params.append('id', issueId.toString());
    if (issueType) params.append('type', issueType);
    if (fromMessageId) params.append('fromMessageId', fromMessageId.toString());

    return call<SupportIssue>({
      url: `support/issue${params.toString() ? `?${params}` : ''}`,
      method: 'GET',
    });
  }

  async function fetchFileData(name: string): Promise<BlobContent> {
    return call<BlobContent>({
      url: `support/issue/file?name=${name}`,
      method: 'GET',
    });
  }

  return <SupportChat.Provider value={context}>{props.children}</SupportChat.Provider>;
}
