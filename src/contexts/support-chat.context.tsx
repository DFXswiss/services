import { CreateSupportIssue, SupportIssueReason, SupportIssueType, useApi } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toBase64 } from 'src/util/utils';

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
  fileName?: string;
}

export interface SupportIssueTransactionDto {
  uid: string;
  url: string;
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
  transaction?: SupportIssueTransactionDto;
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
  loadSupportIssue: (id: number) => Promise<void>;
  createSupportIssue: (request: CreateSupportIssue, file?: File) => Promise<number>;
  submitMessage: (message: string, files: File[], replyToMessage?: SupportMessage) => Promise<void>;
  handleEmojiClick: (messageId: number, emoji: string) => void;
  loadFileData: (messageId: number) => Promise<void>;
  setSync: (sync: boolean) => void;
}

const SupportChat = createContext<SupportChatInterface>(undefined as any);

export const useSupportChat = () => useContext(SupportChat);

export function SupportChatProvider(props: PropsWithChildren): JSX.Element {
  const { call } = useApi();

  const currUnsettledMessageId = useRef(0);

  const [supportIssue, setSupportIssue] = useState<SupportIssue>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isError, setIsError] = useState<string>();
  const [sync, setSync] = useState(false);

  useEffect(() => {
    const interval = setTimeout(() => sync && syncSupportIssue(), 5000);
    return () => clearInterval(interval);
  }, [supportIssue, sync]);

  async function loadSupportIssue(id: number): Promise<void> {
    if (!id || id === supportIssue?.id) return;

    setSupportIssue(undefined);
    setIsLoading(true);
    setIsError(undefined);

    fetchSupportIssue(id)
      .then((response) => setSupportIssue(response))
      .catch(() => setIsError('Error while fetching support issue'))
      .finally(() => setIsLoading(false));
  }

  async function syncSupportIssue(): Promise<void> {
    if (!supportIssue || isLoading || isSyncing) return;

    setIsSyncing(true);
    const fromMessageId = supportIssue.messages[supportIssue.messages.length - 1].id;
    fetchSupportIssue(supportIssue.id, fromMessageId)
      .then((response) => updateSupportIssue(response))
      .catch(() => setIsError('Error while fetching support messages'))
      .finally(() => setIsSyncing(false));
  }

  async function createSupportIssue(request: CreateSupportIssue, file?: File): Promise<number> {
    const dataFile = file && (await mapFileToDataFile(file));
    const messageId = getNextUnsettledMessageId();

    setSupportIssue((supportIssue) => {
      if (!supportIssue) return supportIssue;
      supportIssue.messages.push({
        id: messageId,
        author: 'Customer',
        message: request.message,
        file: dataFile,
        fileName: file?.name,
        created: new Date(),
        status: 'sent',
      });

      return { ...supportIssue };
    });

    try {
      const issue = await createIssue(request);
      settleMessage(messageId, issue.messages[issue.messages.length - 1]);
      updateSupportIssue(issue);
      return issue.id;
    } catch (error) {
      settleMessage(messageId);
      throw error;
    }
  }

  async function submitMessage(message: string, files: File[], replyToMessage?: SupportMessage): Promise<void> {
    if (!supportIssue) return;

    const hasText = message.trim() !== '';
    const numFiles = files.length;

    if (!hasText && numFiles === 0) return;

    const modFiles = numFiles !== 1 && hasText ? [...files, undefined] : files;
    modFiles.forEach(async (file: File | undefined, index) => {
      const dataFile = file && (await mapFileToDataFile(file));
      const messageId = getNextUnsettledMessageId();

      const newMessage: SupportMessage = {
        id: messageId,
        author: 'Customer',
        message: index === modFiles.length - 1 ? message : '',
        file: dataFile,
        fileName: file?.name,
        created: new Date(),
        status: 'sent',
        replyTo: index === 0 ? replyToMessage?.id : undefined,
      };

      setSupportIssue((supportIssue) => {
        if (!supportIssue) return supportIssue;
        supportIssue.messages.push(newMessage);
        return { ...supportIssue };
      });

      createSupportMessage(supportIssue.id, newMessage)
        .then((response) => settleMessage(messageId, response))
        .catch(() => settleMessage(messageId));
    });
  }

  async function loadFileData(messageId: number): Promise<void> {
    const message = supportIssue?.messages.find((m) => m.id === messageId);
    if (!supportIssue || !message?.fileUrl || !message.fileName) throw new Error('Failed to load file data');

    return fetchFileData(supportIssue.id, message.id).then((blobContent) => {
      const byteArray = new Uint8Array(blobContent.data.data);
      const blob = new Blob([byteArray], { type: blobContent.contentType });

      const newFile = {
        file: blobContent.data.data,
        name: message.fileName,
        type: blobContent.contentType,
        size: blob.size,
        url: URL.createObjectURL(blob),
      };

      setSupportIssue((supportIssue) => {
        if (!supportIssue) return supportIssue;
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
      supportIssue,
      isLoading,
      isError,
      loadSupportIssue,
      createSupportIssue,
      submitMessage,
      handleEmojiClick,
      loadFileData,
      setSync,
    }),
    [supportIssue, isLoading, isError, call],
  );

  // --- HELPER FUNCTIONS --- //

  function updateSupportIssue(newState: SupportIssue) {
    setSupportIssue((supportIssue) => {
      if (!supportIssue) return newState;
      supportIssue.messages = [
        ...supportIssue.messages,
        ...newState.messages.filter((m) => !supportIssue.messages.some((sm) => sm.id === m.id)),
      ];
      return { ...supportIssue };
    });
  }

  function settleMessage(messageId: number, newMessage?: SupportMessage) {
    const idx = supportIssue?.messages.findIndex((m) => m.id === messageId);
    if (!supportIssue || !idx || idx === -1) return;

    const settledMessage = supportIssue.messages[idx];

    setSupportIssue((supportIssue) => {
      if (!supportIssue) return supportIssue;
      supportIssue.messages[idx] = { ...settledMessage, ...newMessage, status: newMessage ? 'received' : 'failed' };
      return { ...supportIssue };
    });
  }

  async function mapFileToDataFile(file: File): Promise<DataFile | undefined> {
    const base64File = await toBase64(file);
    if (!base64File) return;

    return {
      file: base64File,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
    };
  }

  function getNextUnsettledMessageId(): number {
    return --currUnsettledMessageId.current;
  }

  // --- API FUNCTIONS --- // TODO: add to packages and import from there

  async function createIssue(request: CreateSupportIssue): Promise<SupportIssue> {
    return call<SupportIssue>({
      url: 'support/issue',
      method: 'POST',
      data: request,
    });
  }

  async function createSupportMessage(issueId: number, newMessage: SupportMessage): Promise<SupportMessage> {
    return call<SupportMessage>({
      url: `support/issue/${issueId}/message`,
      method: 'POST',
      data: {
        author: newMessage.author,
        message: newMessage.message,
        file: newMessage.file?.file,
        fileName: newMessage.fileName,
      },
    });
  }

  async function fetchSupportIssue(id: number, fromMessageId?: number): Promise<SupportIssue> {
    const params = new URLSearchParams({ id: id.toString() });
    if (fromMessageId) params.append('fromMessageId', fromMessageId.toString());

    return call<SupportIssue>({
      url: `support/issue?${params.toString()}`,
      method: 'GET',
    });
  }

  async function fetchFileData(issueId: number, messageId: number): Promise<BlobContent> {
    return call<BlobContent>({
      url: `support/issue/${issueId}/message/${messageId}/file`,
      method: 'GET',
    });
  }

  return <SupportChat.Provider value={context}>{props.children}</SupportChat.Provider>;
}
