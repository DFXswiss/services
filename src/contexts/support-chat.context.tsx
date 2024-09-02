import { CreateSupportIssue, SupportIssueReason, SupportIssueType, useApi, useSupport } from '@dfx.swiss/react';
import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

export interface SupportMessage {
  id: number;
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
  const [currentMessageId, setCurrentMessageId] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState<string>();

  async function preFetch(type: SupportIssueType): Promise<void> {
    setIsLoading(true);
    setIsError(undefined);

    call<SupportIssue>({
      url: `support/issue?type=${type}`,
      method: 'GET',
    })
      .then((response) => {
        setSupportIssue(response);
        setCurrentMessageId(response.messages[-1].id);
      })
      .catch(() => {
        setIsError('Error while fetching support issue');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  async function createSupportIssue(request: CreateSupportIssue): Promise<void> {
    setSupportIssue((supportIssue) => {
      if (!supportIssue) return supportIssue;
      supportIssue.messages.push({
        id: currentMessageId + 1,
        author: 'Customer',
        message: request.message,
        file: request.file
          ? {
              url: request.file ?? 'NO URL',
              name: request.fileName ?? 'NO NAME',
              size: 0,
              type: request.file ? request.file.split('.').pop() ?? 'NO TYPE' : 'NO TYPE',
            }
          : undefined,
        created: new Date(),
      });
      return { ...supportIssue };
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
      const messageId = randomId();
      const newMessage: SupportMessage = {
        id: messageId,
        message: index === modFiles.length - 1 ? message : '',
        file: file && {
          name: file.name,
          url: file.url,
          type: file.type,
          size: file.size,
        },
        created: new Date(),
        author: 'Customer',
        status: 'sent',
        replyTo: index === 0 ? replyToMessage?.id : undefined,
      };

      setSupportIssue((supportIssue) => {
        if (!supportIssue) return supportIssue;
        supportIssue.messages.push(newMessage);
        return { ...supportIssue };
      });

      call<SupportIssue>({
        url: `support/issue/${supportIssue.id}/message`,
        method: 'POST',
        data: {
          author: newMessage.author,
          message: newMessage.message,
          file: newMessage.file && newMessage.file.url, // base64 encoded string of the file
          fileName: newMessage.file && newMessage.file.name,
        },
      })
        .then(() => {
          // TODO: refactor into helper function to update status
          setSupportIssue((supportIssue) => {
            if (!supportIssue) return supportIssue;
            const messageIdx = supportIssue.messages.findIndex((m) => m.id === messageId);
            supportIssue.messages[messageIdx].status = 'received';
            return { ...supportIssue };
          });
        })
        .catch(() => {
          setSupportIssue((supportIssue) => {
            if (!supportIssue) return supportIssue;
            const messageIdx = supportIssue.messages.findIndex((m) => m.id === messageId);
            supportIssue.messages[messageIdx].status = 'failed';
            return { ...supportIssue };
          });
        })
        .finally(() => {
          setIsLoading(false);
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

  function randomId(): number {
    return Math.floor(Math.random() * 1000000);
  }

  const context = useMemo(
    () => ({ supportIssue, isLoading, isError, preFetch, createSupportIssue, submitMessage, handleEmojiClick }),
    [supportIssue, isLoading, isError, call],
  );

  return <SupportChat.Provider value={context}>{props.children}</SupportChat.Provider>;
}
