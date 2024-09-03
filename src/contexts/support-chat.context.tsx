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

    call<SupportIssue>({
      url: `support/issue?type=${type}`,
      method: 'GET',
    })
      .then((response) => {
        setSupportIssue(response);
      })
      .catch(() => {
        setIsError('Error while fetching support issue');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  async function fetchLatestMessages(): Promise<void> {
    if (!supportIssue || isLoading || isSyncing) return;

    setIsSyncing(true);
    call<SupportIssue>({
      url: `support/issue?id=${supportIssue.id}&fromMessageId=${
        supportIssue.messages[supportIssue.messages.length - 1].id
      }`,
      method: 'GET',
    })
      .then((response) => {
        // refactor into a merge/sync function
        setSupportIssue({
          ...response,
          messages: [...supportIssue.messages, ...response.messages],
        });
        setUnsettledMessages((messages) => {
          return [...messages.filter((m) => !response.messages.some((rm) => isMessageEqual(m, rm)))];
        });
      })
      .catch(() => {
        setIsError('Error while fetching support messages');
      })
      .finally(() => {
        setIsSyncing(false);
      });
  }

  async function createSupportIssue(request: CreateSupportIssue): Promise<void> {
    const file = request.file
      ? // TODO: refactor out mapping of file, fileName to DataFile
        {
          url: request.file,
          name: request.fileName || '',
          type: request.file.split('.').pop() || '',
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
        message: index === modFiles.length - 1 ? message : '',
        file: file && {
          url: file.url,
          name: file.name,
          type: file.type,
          size: file.size,
        },
        created: new Date(),
        author: 'Customer',
        status: 'sent',
        replyTo: index === 0 ? replyToMessage?.id : undefined,
      };

      setUnsettledMessages((messages) => {
        messages.push(newMessage);
        return [...messages];
      });

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
        .then(() => {
          // TODO: refactor into helper function to update message props
          setUnsettledMessages((messages) => {
            const messageIdx = messages.findIndex((m) => isMessageEqual(m, newMessage));
            if (messageIdx > -1) messages[messageIdx].status = 'received';
            return [...messages];
          });
        })
        .catch(() => {
          setUnsettledMessages((messages) => {
            const messageIdx = messages.findIndex((m) => isMessageEqual(m, newMessage));
            if (messageIdx > -1) messages[messageIdx].status = 'failed';
            return [...messages];
          });
        });
    });
  }

  // Feature not yet available
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

    // Update context state
    setSupportIssue((supportIssue) => {
      if (!supportIssue) return supportIssue;
      supportIssue.messages[messageIndex] = message;
      return { ...supportIssue };
    });

    // TODO: Update message on server side
  }

  function isMessageEqual(a: SupportMessage, b: SupportMessage): boolean {
    return messageHash(a) === messageHash(b);
  }

  function messageHash(message: SupportMessage): string {
    return `${message.author}-${message.message}`;
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

  useEffect(() => {
    console.log(context.supportIssue);
  }, [context]);

  return <SupportChat.Provider value={context}>{props.children}</SupportChat.Provider>;
}
