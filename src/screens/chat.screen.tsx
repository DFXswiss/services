import { ApiError, SupportIssueType } from '@dfx.swiss/react';
import { SpinnerSize, SpinnerVariant, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { BsReply } from 'react-icons/bs';
import { HiOutlineDownload, HiOutlinePaperClip } from 'react-icons/hi';
import { IoMusicalNotes } from 'react-icons/io5';
import { MdErrorOutline, MdOutlineCancel, MdOutlineClose, MdSend } from 'react-icons/md';
import { RiCheckDoubleFill, RiCheckFill } from 'react-icons/ri';
import { useSearchParams } from 'react-router-dom';
import { useSettingsContext } from 'src/contexts/settings.context';
import { DataFile, SupportMessage, useSupportChat } from 'src/contexts/support-chat.context';
import { useNavigation } from 'src/hooks/navigation.hook';
import { blankedAddress, formatBytes } from 'src/util/utils';
import { Layout } from '../components/layout';

const emojiSet = ['👍', '❤️', '😂', '😮', '😢', '👏'];

export default function ChatScreen(): JSX.Element {
  const { navigate } = useNavigation();
  const { supportIssue, isLoading, isError, preFetch, handleEmojiClick } = useSupportChat();

  const [clickedMessage, setClickedMessage] = useState<SupportMessage>();
  const [replyToMessage, setReplyToMessage] = useState<SupportMessage>();
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [urlParams, setUrlParams] = useSearchParams();
  const [typeParam, setTypeParam] = useState<SupportIssueType>(() => {
    const savedState = sessionStorage.getItem('typeParam');
    return savedState ? JSON.parse(savedState) : '';
  });

  useEffect(() => {
    const param = urlParams.get('type') || typeParam;
    const isValidParam = Object.values(SupportIssueType).includes(param as SupportIssueType);

    if (!param || !isValidParam) {
      if (!isLoading && !isError && !supportIssue) {
        navigate('/support/issue', { replace: true });
        return;
      }
    } else {
      if (param !== typeParam) {
        setTypeParam(param as SupportIssueType);
        sessionStorage.setItem('typeParam', JSON.stringify(param));
      }

      if (urlParams.has('typeParam')) {
        urlParams.delete('typeParam');
        setUrlParams(urlParams);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoading && typeParam && typeParam != supportIssue?.type) preFetch(typeParam);
  }, [typeParam]);

  useEffect(() => {
    if (supportIssue?.messages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [supportIssue?.messages.length]);

  const onChatBubbleClick = (e?: React.MouseEvent<HTMLDivElement>, message?: SupportMessage) => {
    if (!e) {
      setClickedMessage(undefined);
      return;
    }

    e.stopPropagation();
    setMenuPosition({ top: e.clientY, left: e.clientX });
    setClickedMessage(message);
  };

  const onEmojiClick = (messageId: number, emoji: string, e?: React.MouseEvent<HTMLDivElement>) => {
    e?.stopPropagation();
    handleEmojiClick(messageId, emoji);
    setClickedMessage(undefined);
  };

  return (
    <Layout title="Ticket 1390" noPadding>
      {isLoading || !supportIssue ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full h-full">
          <div className="flex flex-col flex-grow gap-1 h-0 overflow-auto p-3.5">
            {supportIssue.messages.map((message, index) => {
              const prevSender = index > 0 ? supportIssue.messages[index - 1].author : null;
              const isNewSender = prevSender !== message.author;
              return (
                <ChatBubble
                  key={message.id}
                  hasHeader={isNewSender}
                  replyToMessage={
                    message.replyTo ? supportIssue.messages.find((m) => m.id === message.replyTo) : undefined
                  }
                  onEmojiClick={onEmojiClick}
                  onClick={(e) => onChatBubbleClick(e, message)}
                  {...message}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <InputComponent replyToMessage={replyToMessage} setReplyToMessage={setReplyToMessage} />
          {clickedMessage?.id !== undefined && (
            <ChatBubbleMenu
              menuPosition={menuPosition}
              clickedMessage={clickedMessage}
              setReplyToMessage={(message) => {
                setReplyToMessage(message);
                setClickedMessage(undefined);
              }}
              onEmojiClick={onEmojiClick}
            />
          )}
        </div>
      )}
    </Layout>
  );
}

interface InputComponentProps {
  replyToMessage?: SupportMessage;
  setReplyToMessage: React.Dispatch<React.SetStateAction<SupportMessage | undefined>>;
}

function InputComponent({ replyToMessage, setReplyToMessage }: InputComponentProps): JSX.Element {
  const { submitMessage } = useSupportChat();
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // TODO: refactor, write it as a normal function
  const handleSend = () => {
    submitMessage(inputValue, selectedFiles, replyToMessage);

    setInputValue('');
    setSelectedFiles([]);
    setReplyToMessage(undefined);
    return;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files as FileList;

    if (files && files.length > 0) {
      setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
      setTimeout(() => (e.target.value = ''), 100);
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

  return (
    <div className="flex flex-col gap-2 p-4 bg-dfxGray-300">
      {replyToMessage && (
        <div className="flex flex-row bg-dfxGray-800/10 rounded-md overflow-clip mx-1.5 py-1 text-dfxBlue-800">
          <div className="w-1 h-full bg-dfxBlue-800" />
          <div className="flex flex-row flex-grow px-2 py-1">
            {replyToMessage.file && (
              <img
                src={replyToMessage.file?.url}
                alt="Media"
                className="rounded-sm max-h-10 object-cover"
                style={{ maxWidth: '100%', width: 'auto', height: 'auto' }}
              />
            )}
            <div className="flex flex-col px-2 text-left">
              <div className="flex flex-row">
                <BsReply className="text-dfxBlue-800 text-lg mr-1" />
                <p className="font-semibold text-sm">{`Reply to ${replyToMessage.author}`}</p>
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
              <p className="text-dfxGray-800 text-left text-sm">{blankedAddress(file.name, { displayLength: 20 })}</p>
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
  );
}

interface ChatBubbleProps extends SupportMessage {
  hasHeader: boolean;
  replyToMessage?: SupportMessage;
  onClick?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onEmojiClick?: (messageId: number, emoji: string, e?: React.MouseEvent<HTMLDivElement>) => void;
}

function ChatBubble({
  id,
  message,
  fileUrl,
  file,
  created,
  author,
  status,
  reactions,
  hasHeader,
  replyToMessage,
  onClick,
  onEmojiClick,
}: ChatBubbleProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { loadFileData } = useSupportChat();

  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null); // TODO: Make this boolean!!]
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [error, setError] = useState<string>();

  const handlePreview = (e: React.MouseEvent<HTMLImageElement | HTMLVideoElement | HTMLDivElement>, file: DataFile) => {
    e.stopPropagation();
    onClick && onClick(undefined); // TODO: Do we need this?

    !selectedFile && setSelectedFile(file);
  };

  const loadFile = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();

    if (!id || !fileUrl) return;
    setIsLoadingFile(true);
    loadFileData(id, fileUrl)
      .catch((e: ApiError) => setError('Download failed'))
      .finally(() => setIsLoadingFile(false));
  };

  const isUser = author === 'Customer';
  const hasFile = fileUrl || !!file;
  const fileType = file?.type?.split('/')[0];

  return (
    <div
      onClick={() => onClick && onClick(undefined)}
      className={`flex text-left ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        onClick={onClick}
        className={`flex flex-col max-w-xs rounded-lg overflow-clip pb-1.5 gap-1.5 ${
          author === 'Customer'
            ? 'bg-[#24A1DE] text-white rounded-br-none'
            : 'bg-dfxGray-400 text-black rounded-bl-none'
        } ${!hasFile || !!replyToMessage ? 'pt-1.5' : ''}`}
      >
        {replyToMessage && (
          <div className="flex flex-row bg-dfxGray-300/20 rounded-md overflow-clip mx-1.5">
            <div className="w-1 h-full bg-white" />
            <div className="flex flex-row flex-grow px-2 py-1">
              {replyToMessage.file && (
                <img
                  src={replyToMessage.file?.url}
                  alt="Media"
                  className="rounded-sm max-h-10 object-cover"
                  style={{ maxWidth: '100%', width: 'auto', height: 'auto' }}
                />
              )}
              <div className="flex flex-col px-2 text-left">
                <p className="font-semibold text-sm">{replyToMessage.author}</p>
                <p className="text-sm line-clamp-1 overflow-ellipsis">{replyToMessage.message ?? 'Media'}</p>
              </div>
            </div>
          </div>
        )}
        {hasHeader && !isUser && !file && <p className="font-semibold text-sm text-dfxRed-150 px-3">{author}</p>}
        {/* TODO: Improve the control flow */}
        {hasFile &&
          (!file ? (
            <div className="flex items-center mb-1 p-2 cursor-pointer" onClick={(e) => loadFile(e)}>
              <div className="flex justify-center items-center w-12 h-12 bg-white rounded-md">
                {isLoadingFile ? (
                  <StyledLoadingSpinner size={SpinnerSize.MD} variant={SpinnerVariant.LIGHT_MODE} />
                ) : (
                  <HiOutlineDownload className="text-dfxGray-700 text-2xl" />
                )}
              </div>
              <div className="flex flex-col mx-2">
                <span className="text-white text-sm font-semibold">
                  {fileUrl && blankedAddress(fileUrl.split('/').pop() ?? fileUrl, { displayLength: 20 })}
                </span>
                <span className="text-dfxGray-400 text-xs">
                  {error ?? translate('general/actions', isLoadingFile ? 'Downloading...' : 'Download')}
                </span>
              </div>
            </div>
          ) : fileType === 'image' ? (
            <img
              src={file.url}
              alt={file.name}
              className="rounded-sm mb-1 max-h-40 object-cover cursor-pointer"
              style={{ maxWidth: '100%', width: 'auto', height: 'auto' }}
              onClick={(e) => handlePreview(e, file)}
            />
          ) : fileType === 'video' ? (
            <video
              controls
              className="rounded-sm mb-1 max-h-40 object-cover cursor-pointer"
              style={{ maxWidth: '100%', width: 'auto', height: 'auto' }}
              onClick={(e) => handlePreview(e, file)}
            >
              <source src={file.url} type={file.type} />
              {translate('general/messages', 'Your browser does not support the video tag.')}
            </video>
          ) : fileType === 'audio' ? (
            <div className="flex items-center mb-1 p-2 cursor-pointer" onClick={(e) => handlePreview(e, file)}>
              <div className="flex justify-center items-center w-12 h-12 bg-white rounded-md">
                <IoMusicalNotes className="text-dfxGray-700 text-2xl" />
              </div>
              <div className="flex flex-col mx-2">
                <span className="text-white text-sm font-semibold">
                  {blankedAddress(file.name, { displayLength: 20 })}
                </span>
                <span className="text-dfxGray-400 text-xs">
                  {file.type.split('/')[1].toUpperCase() ?? file.type} · {formatBytes(file.size)}
                </span>
              </div>
            </div>
          ) : (
            <a
              href={file.url}
              target="_blank"
              className="flex items-center mb-1 p-2 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center items-center w-12 h-12 bg-white rounded-md">
                <HiOutlinePaperClip className="text-dfxGray-700 text-2xl" />
              </div>
              <div className="flex flex-col mx-2">
                <span className="text-white text-sm font-semibold">
                  {blankedAddress(file.name, { displayLength: 20 })}
                </span>
                <span className="text-dfxGray-400 text-xs">
                  {fileType &&
                    (fileType === 'application' ? file.type.split('/')[1] ?? fileType : fileType).toUpperCase()}{' '}
                  · {formatBytes(file.size)}
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
                    <p>{formatBytes(selectedFile.size)}</p>
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
                onClick={(e) => id && onEmojiClick && onEmojiClick(id, reaction.emoji, e)}
                className="flex flex-row gap-1.5 mr-1 rounded-full px-2 py-0.5 bg-white/20 text-sm cursor-pointer"
              >
                <span>{reaction.emoji}</span>
                {reaction.users.length > 0 && <span className="font-semibold">{reaction.users.length}</span>}
              </div>
            ))}
          </div>
          <div className="flex flex-row text-xs italic text-end text-gray-500">
            {new Date(created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            {/* TODO: Cover all states with icons */}
            {status === 'failed' ? (
              <MdErrorOutline className="inline-block text-base ml-1 mb-0.5" />
            ) : status === 'sent' ? (
              <RiCheckFill className="inline-block text-base ml-1 mb-0.5" />
            ) : (
              <RiCheckDoubleFill className="inline-block text-base ml-1 mb-0.5" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChatBubbleMenuProps {
  menuPosition: { top: number; left: number };
  clickedMessage: SupportMessage;
  setReplyToMessage: React.Dispatch<React.SetStateAction<SupportMessage | undefined>>;
  onEmojiClick: (messageId: number, emoji: string) => void;
}

function ChatBubbleMenu({
  menuPosition,
  clickedMessage,
  setReplyToMessage,
  onEmojiClick,
}: ChatBubbleMenuProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
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
            onClick={() => clickedMessage.id !== undefined && onEmojiClick(clickedMessage.id, emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="w-36 border border-dfxGray-400 shadow-md z-10 bg-white rounded-md overflow-clip text-dfxBlue-800 pointer-events-auto">
        <div className="flex flex-col divide-y-0.5 divide-dfxGray-400 items-start bg-dfxGray-100 w-36">
          <button
            className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
            onClick={() => setReplyToMessage(clickedMessage)}
          >
            {translate('general/actions', 'Reply')}
          </button>
        </div>
      </div>
    </div>
  );
}
