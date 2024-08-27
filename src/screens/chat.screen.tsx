import { useEffect, useRef, useState } from 'react';
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
}

interface SupportIssue {
  id: string;
  messages: SupportMessage[];
  participants: string[];
  date: string;
  status: 'active' | 'closed';
}

const initialChat: SupportIssue = {
  id: '1',
  messages: [
    {
      id: '1',
      message: 'Hello',
      media: [],
      date: '2021-10-10T10:10:10',
      sender: 'user',
      status: 'read',
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
      message: 'How can I help you?',
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
      message: '',
      media: ['https://assistanteplus.fr/wp-content/uploads/2022/04/chat-midjourney.webp'],
      date: '2021-10-10T10:10:10',
      sender: 'user',
      status: 'read',
    },
  ],
  participants: ['user', 'agent'],
  date: '2021-10-10T10:10:10',
  status: 'active',
};

export default function ChatScreen(): JSX.Element {
  const { translate } = useSettingsContext();

  const [chat, setChat] = useState<SupportIssue>(initialChat);
  const [inputValue, setInputValue] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleSend = () => {
    if (inputValue.trim() === '') return;

    const newMessage: SupportMessage = {
      id: (chat.messages.length + 1).toString(),
      message: inputValue,
      media: [],
      date: new Date().toISOString(),
      sender: 'user',
      status: 'sent',
    };

    setChat((prevChat) => ({
      ...prevChat,
      messages: [...prevChat.messages, newMessage],
    }));

    setInputValue(''); // Clear the input field after sending
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat.messages]);

  return (
    <Layout title="Ticket #1390" noPadding>
      <div className="flex flex-col gap-2 w-full h-full">
        <div className="flex flex-col flex-grow gap-1 h-0 overflow-auto p-3.5">
          {chat.messages.map((message, index) => {
            const prevSender = index > 0 ? chat.messages[index - 1].sender : null;
            const isNewSender = prevSender !== message.sender;
            return <ChatBubble key={message.id} hasHeader={isNewSender} {...message} />;
          })}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex flex-row gap-2 p-4 bg-dfxGray-300">
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
    </Layout>
  );
}

interface ChatBubbleProps extends SupportMessage {
  hasHeader: boolean;
}

function ChatBubble({ hasHeader, message, media, date, sender, status }: ChatBubbleProps): JSX.Element {
  const isUser = sender === 'user';
  const hasMedia = !!media?.length;

  return (
    <div className={`flex text-left ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex flex-col max-w-xs rounded-lg overflow-clip pb-1.5 ${
          sender === 'user' ? 'bg-[#24A1DE] text-white rounded-br-none' : 'bg-dfxGray-400 text-black rounded-bl-none'
        } ${!hasMedia ? 'pt-1.5 gap-1' : 'gap-1'}`}
      >
        {hasHeader && !isUser && !media?.length && (
          <p className="font-semibold text-sm text-dfxRed-150 px-3">{sender}</p>
        )}
        {hasMedia &&
          media.map((url, index) => <img key={index} src={url} alt="Media" className="rounded-sm max-h-40 mb-1" />)}
        {message && <p className="leading-snug text-sm px-3">{message}</p>}
        <span className="text-xs italic text-end text-gray-500 block px-3">
          {new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          {status === 'read' ? (
            <RiCheckDoubleFill className="inline-block text-base ml-1 mb-0.5" />
          ) : (
            <RiCheckFill className="inline-block text-base ml-1 mb-0.5" />
          )}
        </span>
      </div>
    </div>
  );
}
