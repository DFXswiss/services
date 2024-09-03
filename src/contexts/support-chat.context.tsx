import { CreateSupportIssue, SupportIssueReason, SupportIssueType, useApi, useSupport } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface SupportMessage {
  id?: number;
  author: string;
  created: Date;
  message: string;
  file?: DataFile;
  status?: 'sent' | 'received' | 'failed';
  replyTo?: number;
  reactions?: Reaction[];
}

export interface SupportIssue {
  id: number;
  state: SupportIssueState;
  type: SupportIssueType;
  reason: SupportIssueReason;
  name: string;
  created: Date;
  messages: SupportMessage[];
}

export interface Reaction {
  emoji: string;
  users: string[];
}

export interface DataFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

export enum SupportIssueState {
  CREATED = 'Created',
  PENDING = 'Pending',
  COMPLETED = 'Completed',
}

interface SupportChatInterface {
  supportIssue?: SupportIssue;
  isLoading: boolean;
  isError?: string;
  preFetch: (type: SupportIssueType) => Promise<void>;
  createSupportIssue: (request: CreateSupportIssue) => Promise<void>;
  submitMessage: (message: string, files: DataFile[], replyToMessage?: SupportMessage) => Promise<void>;
  handleEmojiClick: (messageId: number, emoji: string) => void;
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
    const interval = setTimeout(() => fetchLatestMessages(), 5000);
    return () => clearInterval(interval);
  }, [supportIssue]);

  async function preFetch(type: SupportIssueType): Promise<void> {
    setIsLoading(true);
    setIsError(undefined);

    // TODO: Refactor API call into a separate function
    call<SupportIssue>({
      url: `support/issue?type=${type}`,
      method: 'GET',
    })
      .then((response) => setSupportIssue(response))
      .catch(() => setIsError('Error while fetching support issue'))
      .finally(() => setIsLoading(false));
  }

  async function fetchLatestMessages(): Promise<void> {
    if (!supportIssue || isLoading || isSyncing) return;

    setIsSyncing(true);
    const fromMessageId = supportIssue.messages[supportIssue.messages.length - 1].id;
    // TODO: Refactor API call into a separate function
    call<SupportIssue>({
      url: `support/issue?id=${supportIssue.id}&fromMessageId=${fromMessageId}`,
      method: 'GET',
    })
      .then((response) => updateSupportIssue(response))
      .catch(() => setIsError('Error while fetching support messages'))
      .finally(() => setIsSyncing(false));
  }

  async function createSupportIssue(request: CreateSupportIssue): Promise<void> {
    const file = request.file
      ? // TODO: refactor out mapping of file, fileName to DataFile
        {
          url: request.file, // base64 encoded string of the file
          name: request.fileName || '',
          type: request.fileName?.split('.').pop() || '',
          size: 0,
        }
      : undefined;

    setUnsettledMessages((messages) => {
      messages.push({
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
      const newMessage: SupportMessage = {
        author: 'Customer',
        created: new Date(),
        message: index === modFiles.length - 1 ? message : '',
        file: file && {
          url: file.url,
          name: file.name,
          type: file.type,
          size: file.size,
        },
        replyTo: index === 0 ? replyToMessage?.id : undefined,
        status: 'sent',
      };

      setUnsettledMessages((messages) => {
        messages.push(newMessage);
        return [...messages];
      });

      // TODO: Refactor API call into a separate function
      call<SupportIssue>({
        url: `support/issue/${supportIssue.id}/message`,
        method: 'POST',
        data: {
          author: newMessage.author,
          message: newMessage.message,
          file: newMessage.file && newMessage.file.url, // TODO: base64 encoded string of the file
          fileName: newMessage.file && newMessage.file.name,
        },
      })
        .then(() => updateUnsettledMessageStatus(newMessage, 'received'))
        .catch(() => updateUnsettledMessageStatus(newMessage, 'failed'));
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

  function updateSupportIssue(newState: SupportIssue) {
    setSupportIssue((supportIssue) => {
      if (!supportIssue) return newState;
      supportIssue.messages = [...supportIssue.messages, ...newState.messages];
      return { ...supportIssue };
    });

    setUnsettledMessages((messages) => {
      return [...messages.filter((m) => !newState.messages.some((rm) => isMessageEqual(m, rm)))];
    });
  }

  function updateUnsettledMessageStatus(message: SupportMessage, status: 'sent' | 'received' | 'failed') {
    setUnsettledMessages((messages) => {
      const messageIdx = messages.findIndex((m) => isMessageEqual(m, message));
      if (messageIdx > -1) messages[messageIdx].status = status;
      return [...messages];
    });
  }

  function isMessageEqual(a: SupportMessage, b: SupportMessage): boolean {
    return a.author === b.author && a.message === b.message;
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
    }),
    [supportIssue, unsettledMessages, isLoading, isError, call],
  );

  return <SupportChat.Provider value={context}>{props.children}</SupportChat.Provider>;
}
