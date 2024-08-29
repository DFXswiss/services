import { useEffect, useRef, useState } from 'react';
import { BsReply } from 'react-icons/bs';
import { HiOutlineDownload, HiOutlinePaperClip } from 'react-icons/hi';
import { IoMusicalNotes } from 'react-icons/io5';
import { MdOutlineCancel, MdOutlineClose, MdSend } from 'react-icons/md';
import { RiCheckDoubleFill, RiCheckFill } from 'react-icons/ri';
import { useSettingsContext } from 'src/contexts/settings.context';
import { blankedAddress } from 'src/util/utils';
import { Layout } from '../components/layout';

interface SupportMessage {
  id: string;
  message?: string;
  media?: MediaFile;
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

interface MediaFile {
  name: string;
  url: string;
  type: string;
  size: number;
}

const initialChat: SupportIssue = {
  id: '1',
  messages: [
    {
      id: '1',
      message: 'Hello, I have a question',
      media: undefined,
      date: '2021-10-10T10:10:10',
      sender: 'user',
      status: 'read',
      reactions: [{ emoji: '👍', users: ['user'] }],
    },
    {
      id: '2',
      message: 'Hi',
      media: undefined,
      date: '2021-10-10T10:10:10',
      sender: 'agent',
      status: 'received',
    },
    {
      id: '3',
      message: 'How can I help you, today?',
      media: {
        name: 'image.jpg',
        url: 'https://gratisography.com/wp-content/uploads/2024/01/gratisography-cyber-kitty-800x525.jpg',
        type: 'image/jpeg',
        size: 123456,
      },
      date: '2021-10-10T10:10:10',
      sender: 'agent',
      status: 'received',
    },
    {
      id: '4',
      message: 'Hello',
      media: undefined,
      date: '2021-10-10T10:10:10',
      sender: 'user',
      status: 'read',
    },
    {
      id: '5',
      message: undefined,
      media: {
        name: 'image.jpg',
        url: 'https://assistanteplus.fr/wp-content/uploads/2022/04/chat-midjourney.webp',
        type: 'image/webp',
        size: 123456,
      },
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
    const hasText = inputValue.trim() !== '';
    const numFiles = selectedFiles.length;

    if (!hasText && numFiles === 0) return;

    const files = numFiles !== 1 ? [...selectedFiles, undefined] : selectedFiles;
    files.forEach((file, index) => {
      const newMessage: SupportMessage = {
        id: (chat.messages.length + index + 1).toString(),
        message: index === files.length - 1 ? inputValue : undefined,
        media: file && {
          name: file.name,
          url: URL.createObjectURL(file), // Temporary URL for preview
          type: file.type,
          size: file.size,
        },
        date: new Date().toISOString(),
        sender: 'user',
        status: 'sent',
        replyTo: index === 0 ? replyToMessage?.id : undefined,
      };

      setChat((prevChat) => ({
        ...prevChat,
        messages: [...prevChat.messages, newMessage],
      }));
    });

    setInputValue('');
    setSelectedFiles([]);
    setReplyToMessage(undefined);
    return;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (files && files.length > 0) {
      setSelectedFiles((prevFiles) => [...prevFiles, ...Array.from(files)]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        setInputValue((prevValue) => `${prevValue}\n`);
      } else {
        handleSend();
      }
    }
  };

  const handleChatBubbleClick = (e?: React.MouseEvent<HTMLDivElement>, message?: SupportMessage) => {
    if (!e) {
      setClickedMessage(undefined);
      return;
    }

    e.stopPropagation();
    setMenuPosition({ top: e.clientY, left: e.clientX });
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
                  src={replyToMessage.media?.url}
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
          {selectedFiles.length > 0 && (
            <div className="flex flex-row flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex flex-row gap-1.5 items-center bg-dfxGray-800/20 rounded-md p-2 pr-3">
                  <HiOutlinePaperClip className="text-dfxGray-800 text-lg" />
                  <p className="text-dfxGray-800 text-left text-sm">
                    {blankedAddress(file.name, { displayLength: 20 })}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-row items-center space-x-2">
            <label className="flex items-center p-2 cursor-pointer">
              <HiOutlinePaperClip className="text-2xl text-dfxGray-800" />
              <input type="file" multiple onChange={handleFileChange} className="hidden" />
            </label>

            <div
              className="
                grid
                w-full
                text-sm
                after:px-3.5
                after:py-2.5
                [&>textarea]:text-inherit
                after:text-inherit
                [&>textarea]:resize-none
                [&>textarea]:overflow-hidden
                [&>textarea]:[grid-area:1/1/2/2]
                after:[grid-area:1/1/2/2]
                after:whitespace-pre-wrap
                after:invisible
                after:content-[attr(data-cloned-val)_'_']
                after:border
                text-dfxGray-800
                outline-none
                resize-none
                overflow-auto
                max-h-40"
              data-cloned-val={inputValue}
            >
              <textarea
                className="
                  w-full
                  text-slate-600
                  bg-dfxGray-300
                  appearance-none
                  rounded
                  px-3.5
                  py-2.5
                  outline-none"
                name="message"
                id="message"
                rows={1}
                value={inputValue}
                onInput={(e) => setInputValue(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message..."
                required
              />
            </div>

            <button onClick={handleSend} className="items-center p-2 cursor-pointer">
              <MdSend className="text-2xl text-dfxBlue-800" />
            </button>
          </div>
        </div>
        {clickedMessage && (
          <div
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              transform: `${menuPosition.left > window.innerWidth / 2 ? 'translateX(-100%)' : 'translateX(0)'}
                ${menuPosition.top > window.innerHeight / 2 ? 'translateY(-100%)' : 'translateY(0)'}`,
            }}
            className="absolute pointer-events-none"
          >
            <div className="flex flex-row border border-dfxGray-400 shadow-md z-10 bg-white rounded-full overflow-clip h-10 mb-1 pointer-events-auto">
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
            <div className="w-36 border border-dfxGray-400 shadow-md z-10 bg-white rounded-md overflow-clip text-dfxBlue-800 pointer-events-auto">
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
  const { translate } = useSettingsContext();

  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  const handlePreview = (
    e: React.MouseEvent<HTMLImageElement | HTMLVideoElement | HTMLDivElement>,
    file: MediaFile,
  ) => {
    e.stopPropagation();
    onClick && onClick(undefined);

    !selectedFile && setSelectedFile(file);
  };

  const isUser = sender === 'user';
  const mediaType = media?.type?.split('/')[0];

  return (
    <div
      onClick={() => onClick && onClick(undefined)}
      className={`flex text-left ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        onClick={onClick}
        className={`flex flex-col max-w-xs rounded-lg overflow-clip pb-1.5 ${
          sender === 'user' ? 'bg-[#24A1DE] text-white rounded-br-none' : 'bg-dfxGray-400 text-black rounded-bl-none'
        } ${!mediaType || !!replyToMessage ? 'pt-1.5 gap-1.5' : 'gap-1.5'}`}
      >
        {replyToMessage && (
          <div className="flex flex-row bg-dfxGray-300/20 rounded-md overflow-clip mx-1.5">
            <div className="w-1 h-full bg-white" />
            <div className="flex flex-row flex-grow px-2 py-1">
              <img
                src={replyToMessage.media?.url}
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
        {hasHeader && !isUser && !media && <p className="font-semibold text-sm text-dfxRed-150 px-3">{sender}</p>}
        {mediaType &&
          (mediaType === 'image' ? (
            <img
              src={media.url}
              alt={media.name}
              className="rounded-sm mb-1 max-h-40 object-cover cursor-pointer"
              style={{ maxWidth: '100%', width: 'auto', height: 'auto' }}
              onClick={(e) => handlePreview(e, media)}
            />
          ) : mediaType === 'video' ? (
            <video
              controls
              className="rounded-sm mb-1 max-h-40 object-cover cursor-pointer"
              style={{ maxWidth: '100%', width: 'auto', height: 'auto' }}
              onClick={(e) => handlePreview(e, media)}
            >
              <source src={media.url} type={media.type} />
              {translate('general/messages', 'Your browser does not support the video tag.')}
            </video>
          ) : mediaType === 'audio' ? (
            <div className="flex items-center mb-1 p-2 cursor-pointer" onClick={(e) => handlePreview(e, media)}>
              <div className="flex justify-center items-center w-12 h-12 bg-white rounded-md">
                <IoMusicalNotes className="text-dfxGray-700 text-2xl" />
              </div>
              <div className="flex flex-col mx-2">
                <span className="text-white text-sm font-semibold">{media.name}</span>
                <span className="text-dfxGray-400 text-xs">
                  {media.type.split('/')[1].toUpperCase() ?? media.type} · {Math.round(media.size / 1024)} KB
                </span>
              </div>
            </div>
          ) : (
            <a
              href={media.url}
              target="_blank"
              className="flex items-center mb-1 p-2 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center items-center w-12 h-12 bg-white rounded-md">
                <HiOutlinePaperClip className="text-dfxGray-700 text-2xl" />
              </div>
              <div className="flex flex-col mx-2">
                <span className="text-white text-sm font-semibold">{media.name}</span>
                <span className="text-dfxGray-400 text-xs">
                  {(mediaType === 'application' ? media.type.split('/')[1] : mediaType).toUpperCase()} ·{' '}
                  {Math.round(media.size / 1024)} KB
                </span>
              </div>
            </a>
          ))}
        {selectedFile && (
          <div
            className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-white pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
            >
              <MdOutlineClose className="text-2xl" />
            </button>
            <div className="relative m-4 pointer-events-auto">
              <div className="rounded-sm overflow-clip">
                {selectedFile.type.startsWith('image') && (
                  <img src={selectedFile.url} alt={selectedFile.name} className="max-h-96" />
                )}
                {selectedFile.type.startsWith('video') && (
                  <video controls className="max-h-96">
                    <source src={selectedFile.url} type={selectedFile.type} />
                  </video>
                )}
                {selectedFile.type.startsWith('audio') && (
                  <audio controls className="max-h-96">
                    <source src={selectedFile.url} type={selectedFile.type} />
                  </audio>
                )}
                {selectedFile.type.startsWith('application') && (
                  <div className="text-center">
                    <HiOutlinePaperClip className="text-dfxGray-700 text-4xl mx-auto mb-4" />
                    <p className="text-lg font-semibold">{selectedFile.name}</p>
                    <p>{Math.round(selectedFile.size / 1024)} KB</p>
                  </div>
                )}
              </div>
              <div className="flex mt-4 items-center justify-center">
                <a
                  className="bg-white/30 text-white pl-4 pr-6 py-2 rounded-full font-semibold cursor-pointer"
                  href={selectedFile.url}
                >
                  <div className="flex flex-row gap-2">
                    <HiOutlineDownload className="text-xl" />
                    {translate('general/actions', 'Download')}
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}
        {message && <p className="leading-snug text-sm px-3 whitespace-pre-wrap">{message}</p>}
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
