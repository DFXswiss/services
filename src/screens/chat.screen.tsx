import { useEffect, useRef, useState } from 'react';
import { BsReply } from 'react-icons/bs';
import { MdOutlineCancel } from 'react-icons/md';
import { RiCheckDoubleFill, RiCheckFill } from 'react-icons/ri';
import { useSettingsContext } from 'src/contexts/settings.context';
import { Layout } from '../components/layout';

interface SupportMessage {
  id: string;
  message?: string;
  media?: string[];
  date: string;
  sender: string;
  status: 'sent' | 'received' | 'read';
  replyTo?: string;
  reactions?: Reaction[];
}

interface SupportIssue {
  id: string;
  messages: SupportMessage[];
  participants: string[];
  date: string;
  status: 'active' | 'closed';
}

interface Reaction {
  emoji: string;
  users: string[];
}

const initialChat: SupportIssue = {
  id: '1',
  messages: [
    {
      id: '1',
      message: 'Hello, I have a question',
      media: [],
      date: '2021-10-10T10:10:10',
      sender: 'user',
      status: 'read',
      reactions: [{ emoji: '👍', users: ['user'] }],
    },
    {
      id: '2',
      message: 'Hi',
      media: [],
      date: '2021-10-10T10:10:10',
      sender: 'agent',
      status: 'received',
    },
    {
      id: '3',
      message: 'How can I help you, today?',
      media: ['https://gratisography.com/wp-content/uploads/2024/01/gratisography-cyber-kitty-800x525.jpg'],
      date: '2021-10-10T10:10:10',
      sender: 'agent',
      status: 'received',
    },
    {
      id: '4',
      message: 'Hello',
      media: [],
      date: '2021-10-10T10:10:10',
      sender: 'user',
      status: 'read',
    },
    {
      id: '5',
      message: undefined,
      media: ['https://assistanteplus.fr/wp-content/uploads/2022/04/chat-midjourney.webp'],
      date: '2021-10-10T10:10:10',
      sender: 'user',
      status: 'read',
      replyTo: '3',
    },
  ],
  participants: ['user', 'agent'],
  date: '2021-10-10T10:10:10',
  status: 'active',
};

const emojiSet = ['👍', '❤️', '😂', '😮', '😢', '👏'];

export default function ChatScreen(): JSX.Element {
  const { translate } = useSettingsContext();

  const [chat, setChat] = useState<SupportIssue>(initialChat);
  const [inputValue, setInputValue] = useState<string>('');
  const [clickedMessage, setClickedMessage] = useState<SupportMessage>();
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [replyToMessage, setReplyToMessage] = useState<SupportMessage>();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat.messages]);

  const handleSend = () => {
    if (inputValue.trim() === '') return;

    const newMessage: SupportMessage = {
      id: (chat.messages.length + 1).toString(),
      message: inputValue,
      media: [],
      date: new Date().toISOString(),
      sender: 'user',
      status: 'sent',
      replyTo: replyToMessage?.id,
    };

    setChat((prevChat) => ({
      ...prevChat,
      messages: [...prevChat.messages, newMessage],
    }));

    setInputValue('');
    setReplyToMessage(undefined);
  };

  const handleChatBubbleClick = (e?: React.MouseEvent<HTMLDivElement>, message?: SupportMessage) => {
    if (!e) {
      setClickedMessage(undefined);
      return;
    }

    e.stopPropagation();
    const menuWidth = 150; // Assume a fixed width for the menu
    const menuHeight = 100; // Assume a fixed height for the menu
    const { clientX, clientY } = e;

    let left = clientX;
    let top = clientY;

    // Check if the menu would overflow the right side of the screen
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth;
    }

    // Check if the menu would overflow the bottom of the screen
    if (top + menuHeight > window.innerHeight) {
      top = window.innerHeight - menuHeight;
    }

    setMenuPosition({ top, left });
    setClickedMessage(message);
  };

  const handleEmojiClick = (messageId: string, emoji: string, e?: React.MouseEvent<HTMLDivElement>) => {
    e?.stopPropagation();

    setChat((prevChat) => {
      const messageIndex = prevChat.messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return prevChat;

      const message = prevChat.messages[messageIndex];
      if (!message.reactions) message.reactions = [];
      const reactionIndex = message.reactions?.findIndex((r) => r.emoji === emoji);
      if (reactionIndex === -1) {
        message.reactions.push({ emoji, users: ['user'] });
      } else {
        const userIndex = message.reactions[reactionIndex].users.indexOf('user');
        if (userIndex === -1) {
          message.reactions[reactionIndex].users.push('user');
        } else {
          message.reactions[reactionIndex].users.splice(userIndex, 1);
          if (message.reactions[reactionIndex].users.length === 0) {
            message.reactions.splice(reactionIndex, 1);
          }
        }
      }

      prevChat.messages[messageIndex] = message;
      console.log(message);
      return { ...prevChat };
    });

    setClickedMessage(undefined);
  };

  return (
    <Layout title="Ticket 1390" noPadding>
      <div className="flex flex-col gap-2 w-full h-full">
        <div className="flex flex-col flex-grow gap-1 h-0 overflow-auto p-3.5">
          {chat.messages.map((message, index) => {
            const prevSender = index > 0 ? chat.messages[index - 1].sender : null;
            const isNewSender = prevSender !== message.sender;
            return (
              <ChatBubble
                key={message.id}
                hasHeader={isNewSender}
                replyToMessage={chat.messages.find((m) => m.id === message.replyTo)}
                handleEmojiClick={handleEmojiClick}
                onClick={(e) => handleChatBubbleClick(e, message)}
                {...message}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex flex-col gap-2 p-4 bg-dfxGray-300">
          {replyToMessage && (
            <div className="flex flex-row bg-dfxGray-800/10 rounded-md overflow-clip mx-1.5 py-1 text-dfxBlue-800">
              <div className="w-1 h-full bg-dfxBlue-800" />
              <div className="flex flex-row flex-grow px-2 py-1">
                <img
                  src={replyToMessage.media?.[0]}
                  alt="Media"
                  className="rounded-sm max-h-10 object-cover"
                  style={{ maxWidth: '100%', width: 'auto', height: 'auto' }}
                />
                <div className="flex flex-col px-2 text-left">
                  <div className="flex flex-row">
                    <BsReply className="text-dfxBlue-800 text-lg mr-1" />
                    <p className="font-semibold text-sm">{`Reply to ${replyToMessage.sender}`}</p>
                  </div>
                  <p className="text-sm line-clamp-1 overflow-ellipsis">{replyToMessage.message ?? 'Media'}</p>
                </div>
              </div>
              <button className="px-5 cursor-pointer text-dfxGray-700" onClick={() => setReplyToMessage(undefined)}>
                <MdOutlineCancel className="text-xl" />
              </button>
            </div>
          )}
          <div className="flex flex-row">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-grow p-4 bg-dfxGray-300 rounded-lg text-dfxGray-800 outline-none"
              placeholder="Type a message..."
            />
            <button onClick={handleSend} className="p-4 bg-[#24A1DE] rounded-lg">
              {translate('general/actions', 'Send')}
            </button>
          </div>
        </div>
        {clickedMessage && (
          <div style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }} className="absolute">
            <div className="flex flex-row border border-dfxGray-400 shadow-md z-10 bg-white rounded-full overflow-clip h-10 mb-1">
              {emojiSet.map((emoji, index) => (
                <button
                  key={index}
                  className="hover:bg-dfxGray-300 w-10 text-lg flex items-center justify-center"
                  onClick={() => handleEmojiClick(clickedMessage.id, emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="w-36 border border-dfxGray-400 shadow-md z-10 bg-white rounded-md overflow-clip text-dfxBlue-800">
              <div className="flex flex-col divide-y-0.5 divide-dfxGray-400 items-start bg-dfxGray-100 w-36">
                <button
                  className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
                  onClick={() => {
                    console.log('Copy');
                  }}
                >
                  {translate('general/actions', 'Copy')}
                </button>
                <button
                  className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
                  onClick={() => {
                    setReplyToMessage(clickedMessage);
                    setClickedMessage(undefined);
                  }}
                >
                  {translate('general/actions', 'Reply')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

interface ChatBubbleProps extends SupportMessage {
  hasHeader: boolean;
  replyToMessage?: SupportMessage;
  handleEmojiClick?: (messageId: string, emoji: string, e?: React.MouseEvent<HTMLDivElement>) => void;
  onClick?: (e?: React.MouseEvent<HTMLDivElement>) => void;
}

function ChatBubble({
  id,
  message,
  media,
  date,
  sender,
  status,
  reactions,
  hasHeader,
  replyToMessage,
  handleEmojiClick,
  onClick,
}: ChatBubbleProps): JSX.Element {
  const isUser = sender === 'user';
  const hasMedia = !!media?.length;

  return (
    <div
      onClick={() => onClick && onClick(undefined)}
      className={`flex text-left ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        onClick={onClick}
        className={`flex flex-col max-w-xs rounded-lg overflow-clip pb-1.5 ${
          sender === 'user' ? 'bg-[#24A1DE] text-white rounded-br-none' : 'bg-dfxGray-400 text-black rounded-bl-none'
        } ${!hasMedia || !!replyToMessage ? 'pt-1.5 gap-1.5' : 'gap-1.5'}`}
      >
        {replyToMessage && (
          <div className="flex flex-row bg-dfxGray-300/20 rounded-md overflow-clip mx-1.5">
            <div className="w-1 h-full bg-white" />
            <div className="flex flex-row flex-grow px-2 py-1">
              <img
                src={replyToMessage.media?.[0]}
                alt="Media"
                className="rounded-sm max-h-10 object-cover"
                style={{ maxWidth: '100%', width: 'auto', height: 'auto' }}
              />
              <div className="flex flex-col px-2 text-left">
                <p className="font-semibold text-sm">{replyToMessage.sender}</p>
                <p className="text-sm line-clamp-1 overflow-ellipsis">{replyToMessage.message ?? 'Media'}</p>
              </div>
            </div>
          </div>
        )}
        {hasHeader && !isUser && !media?.length && (
          <p className="font-semibold text-sm text-dfxRed-150 px-3">{sender}</p>
        )}
        {hasMedia &&
          media.map((url, index) => (
            <img
              key={index}
              src={url}
              alt="Media"
              className="rounded-sm mb-1 max-h-40 object-cover"
              style={{ maxWidth: '100%', width: 'auto', height: 'auto' }}
            />
          ))}
        {message && <p className="leading-snug text-sm px-3">{message}</p>}
        <div className="flex flex-row justify-between items-center px-3 -mt-0.5">
          <div className="flex flex-row">
            {reactions?.map((reaction, index) => (
              <div
                key={index}
                onClick={(e) => handleEmojiClick && handleEmojiClick(id, reaction.emoji, e)}
                className="flex flex-row gap-1.5 mr-1 rounded-full px-2 py-0.5 bg-white/20 text-sm cursor-pointer"
              >
                <span>{reaction.emoji}</span>
                {reaction.users.length > 0 && <span className="font-semibold">{reaction.users.length}</span>}
              </div>
            ))}
          </div>
          <div className="flex flex-row text-xs italic text-end text-gray-500">
            {new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            {status === 'read' ? (
              <RiCheckDoubleFill className="inline-block text-base ml-1 mb-0.5" />
            ) : (
              <RiCheckFill className="inline-block text-base ml-1 mb-0.5" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
