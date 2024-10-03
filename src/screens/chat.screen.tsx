import {
  ApiError,
  SupportMessage,
  Transaction,
  TransactionState,
  TransactionType,
  useSupportChatContext,
  useTransaction,
} from '@dfx.swiss/react';
import {
  AssetIconVariant,
  DfxAssetIcon,
  DfxIcon,
  IconSize,
  IconVariant,
  SpinnerSize,
  SpinnerVariant,
  StyledCollapsible,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { DataFile, SupportMessageStatus } from '@dfx.swiss/react/dist/definitions/support';
import { useEffect, useRef, useState } from 'react';
import { BsReply } from 'react-icons/bs';
import { HiOutlineDownload, HiOutlinePaperClip } from 'react-icons/hi';
import { MdAccessTime, MdErrorOutline, MdOutlineCancel, MdOutlineClose, MdSend } from 'react-icons/md';
import { RiCheckFill } from 'react-icons/ri';
import { useParams } from 'react-router-dom';
import { IssueTypeLabels, toPaymentStateLabel } from 'src/config/labels';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useNavigation } from 'src/hooks/navigation.hook';
import { useSessionStore } from 'src/hooks/session-store.hook';
import { blankedAddress, formatBytes } from 'src/util/utils';
import { Layout } from '../components/layout';
import { TxInfo } from './transaction.screen';

const emojiSet = ['👍', '❤️', '😂', '😮', '😢', '👏'];

export default function ChatScreen(): JSX.Element {
  const { navigate } = useNavigation();
  const { translate } = useSettingsContext();
  const { supportIssue, isLoading, loadSupportIssue, handleEmojiClick, setSync } = useSupportChatContext();
  const { supportIssueUid: supportIssueUidStore } = useSessionStore();
  const { id: issueUidParam } = useParams();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [clickedMessage, setClickedMessage] = useState<SupportMessage>();
  const [replyToMessage, setReplyToMessage] = useState<SupportMessage>();
  const [menuPosition, _setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [sessionUid, setSessionUid] = useState<string>(() => {
    return supportIssueUidStore.get() || '';
  });

  useEffect(() => {
    if (issueUidParam) {
      setSessionUid(issueUidParam);
      supportIssueUidStore.set(issueUidParam);
      navigate('/support/chat', { replace: true });
    } else if (sessionUid) {
      setSync(true);
      loadSupportIssue(sessionUid).catch(() => {
        navigate('/support/issue', { replace: true });
      });
    } else {
      navigate('/support/issue', { replace: true });
    }

    return () => setSync(false);
  }, [issueUidParam, sessionUid]);

  useEffect(() => {
    if (supportIssue?.messages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [supportIssue?.messages.length]);

  function onChatBubbleClick(e?: React.MouseEvent<HTMLDivElement>, message?: SupportMessage) {
    if (!e) {
      setClickedMessage(undefined);
      return;
    }

    e.stopPropagation();
    // TODO: Uncomment to enable replies & reactions (feature not yet available)
    // setMenuPosition({ top: e.clientY, left: e.clientX });
    // setClickedMessage(message);
  }

  function onEmojiClick(messageId: number, emoji: string, e?: React.MouseEvent<HTMLDivElement>) {
    e?.stopPropagation();
    handleEmojiClick(messageId, emoji);
    setClickedMessage(undefined);
  }

  return (
    <Layout
      title={supportIssue && translate('screens/support', IssueTypeLabels[supportIssue?.type])}
      onBack={() => navigate('/support/issue')}
      noPadding
    >
      {isLoading || !supportIssue ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full h-full">
          <div className="flex flex-col flex-grow gap-1 h-0 overflow-auto p-3.5">
            {!!supportIssue.transaction && <TransactionComponent transactionUid={supportIssue.transaction.uid} />}
            {supportIssue.messages.map((message, index) => {
              const prevSender = index > 0 ? supportIssue.messages[index - 1].author : null;
              const isNewSender = prevSender !== message.author;
              return (
                <div key={message.id}>
                  {index > 0 &&
                    new Date(message.created).getDate() !==
                      new Date(supportIssue.messages[index - 1].created).getDate() && (
                      <DateTag date={message.created} />
                    )}
                  <ChatBubble
                    hasHeader={isNewSender}
                    replyToMessage={
                      message.replyTo ? supportIssue.messages.find((m) => m.id === message.replyTo) : undefined
                    }
                    onEmojiClick={onEmojiClick}
                    onClick={(e) => onChatBubbleClick(e, message)}
                    {...message}
                  />
                </div>
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

interface TransactionComponentProps {
  transactionUid: string;
}

function TransactionComponent({ transactionUid }: TransactionComponentProps): JSX.Element {
  const { getTransactionByUid } = useTransaction();
  const { translate } = useSettingsContext();

  const [tx, setTx] = useState<Transaction>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getTransactionByUid(transactionUid)
      .then(setTx)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }, [transactionUid]);

  const isUnassigned = tx?.state === TransactionState.UNASSIGNED;
  const icon =
    tx &&
    !isUnassigned &&
    (tx.type === TransactionType.SELL ? [tx.inputAsset, tx.outputAsset] : [tx.outputAsset, tx.inputAsset])
      .map((a) => a?.replace(/^d/, '') as AssetIconVariant)
      .find((a) => Object.values(AssetIconVariant).includes(a));

  return (
    <div className="flex w-full justify-center mb-2">
      {!tx || isLoading ? (
        <div className="flex flex-row gap-2 justify-center bg-dfxGray-300/50 w-full rounded-md p-4">
          {!error && <StyledLoadingSpinner size={SpinnerSize.MD} variant={SpinnerVariant.LIGHT_MODE} />}
          <span className={`text-sm ${error ? 'text-dfxRed-100' : 'text-dfxBlue-600'}`}>
            {error ?? translate('screen/payments', 'Loading transaction...')}
          </span>
        </div>
      ) : (
        <StyledCollapsible
          full
          titleContent={
            <div className="flex flex-row gap-2 items-center">
              {icon ? (
                <DfxAssetIcon asset={icon as AssetIconVariant} />
              ) : (
                <DfxIcon icon={IconVariant.HELP} size={IconSize.LG} />
              )}
              <div className="flex flex-col items-start text-left">
                <div className="font-bold leading-none">{translate('screens/payment', tx.type)}</div>
                <div className={`leading-none ${isUnassigned && 'text-dfxRed-100'}`}>
                  {translate('screens/payment', toPaymentStateLabel(tx.state))}
                </div>
              </div>
              <div className="ml-auto">
                {tx.inputAsset ? `${tx.inputAmount ?? ''} ${tx.inputAsset}` : ''}
                {tx.inputAsset && tx.outputAsset ? ' → ' : ''}
                {tx.outputAsset ? `${tx.outputAmount ?? ''} ${tx.outputAsset}` : ''}
              </div>
            </div>
          }
        >
          <StyledVerticalStack full gap={4}>
            <TxInfo tx={tx} />
          </StyledVerticalStack>
        </StyledCollapsible>
      )}
    </div>
  );
}

interface DateTagProps {
  date: Date;
}

function DateTag({ date }: DateTagProps): JSX.Element {
  const { language } = useSettingsContext();

  const dateStringLangMap: { [language: string]: string } = {
    en: 'en-US',
    de: 'de-DE',
    fr: 'fr-FR',
    it: 'it-IT',
  };

  const dateStringLang = dateStringLangMap[language?.symbol.toLowerCase() ?? 'en'];

  return (
    <div className="flex flex-wrap justify-center py-8">
      <div className=" text-xs font-semibold py-1 px-3 bg-dfxGray-300 text-dfxGray-700 rounded-full">
        {new Date(date).toLocaleDateString([dateStringLang, 'en-US'], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
      </div>
    </div>
  );
}

interface InputComponentProps {
  replyToMessage?: SupportMessage;
  setReplyToMessage: React.Dispatch<React.SetStateAction<SupportMessage | undefined>>;
}

function InputComponent({ replyToMessage, setReplyToMessage }: InputComponentProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { submitMessage } = useSupportChatContext();
  const [inputValue, setInputValue] = useState<string>();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  function handleSend() {
    submitMessage(inputValue, selectedFiles, replyToMessage);

    setInputValue('');
    setSelectedFiles([]);
    setReplyToMessage(undefined);
    return;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files as FileList;

    if (files && files.length > 0) {
      setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
      setTimeout(() => (e.target.value = ''), 100);
    }
  }

  function removeFile(index: number) {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        setInputValue((prevValue) => (prevValue ? `${prevValue}\n` : ''));
      } else {
        handleSend();
      }
    }
  }

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
            <div
              key={index}
              className="flex flex-row gap-1.5 items-center text-dfxGray-800 bg-dfxGray-500 rounded-md p-2 pr-3"
            >
              <HiOutlinePaperClip className="text-lg" />
              <p className="text-left text-sm">{blankedAddress(file.name, { displayLength: 20 })}</p>
              <MdOutlineClose
                className="text-dfxGray-300 text-md ml-1 bg-dfxGray-800/40 rounded-full p-0.5 cursor-pointer"
                onClick={() => removeFile(index)}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-row items-center space-x-2">
        <label className="flex items-center p-2 cursor-pointer">
          <HiOutlinePaperClip className="text-2xl text-dfxGray-800" />
          <input className="hidden" type="file" multiple accept=".pdf, .jpeg, .jpg, .png" onChange={handleFileChange} />
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
            placeholder={translate('screens/support', 'Write a message...')}
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
  fileName,
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

  const isUser = !author || author === 'Customer';
  const hasFile = !!fileName;
  const failedToSend = status === SupportMessageStatus.FAILED;

  return (
    <div
      onClick={() => onClick && onClick(undefined)}
      className={`flex text-left ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        onClick={onClick}
        className={`flex flex-col max-w-xs rounded-lg overflow-clip pb-1.5 gap-1.5 ${
          isUser ? 'bg-[#24A1DE] text-white rounded-br-none' : 'bg-dfxGray-400 text-black rounded-bl-none'
        } ${!hasFile || !!replyToMessage ? 'pt-1.5' : ''} ${failedToSend ? 'opacity-60 pointer-events-none' : ''}`}
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
                <p className="text-sm line-clamp-1 overflow-ellipsis">
                  {replyToMessage.message ?? translate('screens/support', 'Media')}
                </p>
              </div>
            </div>
          </div>
        )}
        {hasHeader && !isUser && !file && <p className="font-semibold text-sm text-dfxRed-150 px-3">{author}</p>}
        {hasFile && <ChatBubbleFileEmbed messageId={id} fileName={fileName} file={file} />}
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
          <div className="flex flex-row items-center justify-center text-xs italic text-end text-gray-500">
            {new Date(created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            {failedToSend ? (
              <MdErrorOutline className="inline-block text-base ml-1 mb-0.5" />
            ) : status === SupportMessageStatus.SENT ? (
              <MdAccessTime className="inline-block text-base ml-1 mb-0.5" />
            ) : (
              <RiCheckFill className="inline-block text-base ml-1 mb-0.5" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChatBubbleFileEmbedProps {
  messageId: number;
  fileName?: string;
  file?: DataFile;
}

enum FileType {
  IMAGE = 'Image',
  DOCUMENT = 'Document',
}

const FileTypeMap: { [key: string]: FileType } = {
  application: FileType.DOCUMENT,
  image: FileType.IMAGE,
};

function ChatBubbleFileEmbed({ messageId, fileName, file }: ChatBubbleFileEmbedProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { loadFileData } = useSupportChatContext();

  const [showPreview, setShowPreview] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [error, setError] = useState<string>();

  const isLoaded = !!file;
  const hasFile = !!fileName;
  const fileType = (isLoaded && FileTypeMap[file?.type.split('/')[0]]) || FileType.DOCUMENT;

  if (!hasFile) return <></>;

  function onClick(e: React.MouseEvent<any>) {
    e.stopPropagation();

    if (isLoaded) {
      fileType === FileType.DOCUMENT ? window.open(file.url, '_blank') : setShowPreview(true);
    } else {
      setError(undefined);
      setIsLoadingFile(true);
      loadFileData(messageId)
        .catch(() => setError('Download failed'))
        .finally(() => setIsLoadingFile(false));
    }
  }

  const icon = isLoadingFile ? (
    <StyledLoadingSpinner size={SpinnerSize.MD} variant={SpinnerVariant.LIGHT_MODE} />
  ) : !isLoaded ? (
    <HiOutlineDownload />
  ) : (
    <HiOutlinePaperClip />
  );

  const description = isLoadingFile
    ? translate('screens/support', 'Downloading...')
    : !isLoaded
    ? translate('general/actions', 'Download')
    : `${translate('screens/support', fileType)} · ${formatBytes(file.size)}`;

  return (
    <>
      {isLoaded && fileType === FileType.IMAGE ? (
        <img
          src={file.url}
          alt={fileName}
          className="rounded-sm mb-1 max-h-40 object-cover cursor-pointer"
          style={{ maxWidth: '100%', width: 'auto', height: 'auto' }}
          onClick={onClick}
        />
      ) : (
        <div className="flex items-center mb-1 p-2 cursor-pointer" onClick={onClick}>
          <div className="flex justify-center items-center w-12 h-12 bg-white text-dfxGray-700 text-2xl rounded-md">
            {icon}
          </div>
          <div className="flex flex-col mx-2">
            <span className="text-sm font-semibold">{blankedAddress(fileName, { displayLength: 20 })}</span>
            <span className="text-xs font-medium opacity-60">{error ?? description}</span>
          </div>
        </div>
      )}
      {showPreview && isLoaded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute top-3 right-3 text-white pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              setShowPreview(false);
            }}
          >
            <MdOutlineClose className="text-2xl" />
          </button>
          <div className="relative m-4 pointer-events-auto">
            <div className="rounded-sm overflow-clip">
              {fileType === FileType.IMAGE ? (
                <img src={file.url} alt={fileName} className="max-h-96" />
              ) : (
                <div className="text-center">
                  <HiOutlinePaperClip className="text-dfxGray-700 text-4xl mx-auto mb-4" />
                  <p className="text-lg font-semibold">{fileName}</p>
                  <p>{formatBytes(file.size)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
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
