import { Department, SupportIssueInternalState, useAuthContext, UserRole } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FilePreviewPanel } from 'src/components/compliance/file-preview-panel';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useSupportDashboardGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import {
  ASSIGNABLE_DEPARTMENTS,
  CustomerAuthor,
  SupportIssueInternalData,
  SupportMessageInfo,
  useSupportDashboard,
} from 'src/hooks/support-dashboard.hook';
import { formatDateTime, statusBadge } from 'src/util/compliance-helpers';
import { reasonLabel, typeLabel } from 'src/util/support-helpers';
import { toBase64 } from 'src/util/utils';

export default function SupportDashboardIssueScreen(): JSX.Element {
  useSupportDashboardGuard();

  const { id } = useParams();
  const { translate } = useSettingsContext();
  const { session } = useAuthContext();
  const canAccessCompliance = session?.role === UserRole.ADMIN || session?.role === UserRole.COMPLIANCE;
  const { getIssueData, updateIssue, sendMessage, getIssueMessages, getMessageFile, getClerks } = useSupportDashboard();
  const { navigate } = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [issueData, setIssueData] = useState<SupportIssueInternalData>();
  const [messages, setMessages] = useState<SupportMessageInfo[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const visibleIdsRef = useRef<Set<number>>(new Set());
  const [clerks, setClerks] = useState<string[]>([]);

  // Update form state
  const [updateState, setUpdateState] = useState('');
  const [updateDepartment, setUpdateDepartment] = useState('');
  const [updateClerk, setUpdateClerk] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Message form state
  const [messageText, setMessageText] = useState('');
  const [messageAuthor, setMessageAuthor] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File preview state
  const [filePreview, setFilePreview] = useState<{ url: string; contentType: string; name: string }>();
  const [splitPercent, setSplitPercent] = useState(66);
  const containerRef = useRef<HTMLDivElement>(null);

  const isComplianceDept = issueData?.department === Department.COMPLIANCE;

  useLayoutOptions({ title: translate('screens/support', 'Support Issue'), backButton: true, noMaxWidth: true });

  useEffect(() => {
    getClerks()
      .then((list) => {
        setClerks(list);
        setMessageAuthor((prev) => prev || list[0] || '');
      })
      .catch(() => undefined);
  }, [getClerks]);

  const loadIssue = useCallback((): void => {
    if (!id) return;
    setIsLoading(true);
    getIssueData(+id)
      .then((data) => {
        setIssueData(data);
        setUpdateState(data.state);
        setUpdateDepartment(data.department ?? '');
        setUpdateClerk(data.clerk ?? '');
        setMessageAuthor((prev) => (data.clerk && clerks.includes(data.clerk) ? data.clerk : prev || clerks[0] || ''));
      })
      .catch((e: Error) => setLoadError(e.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }, [id, getIssueData, clerks]);

  const loadMessages = useCallback((): void => {
    if (!issueData?.uid) return;
    getIssueMessages(issueData.uid)
      .then((fetched) => {
        setMessages(fetched);
        setPendingCount(0);
      })
      .catch((e: Error) => setActionError(e.message ?? 'Failed to load messages'));
  }, [issueData?.uid, getIssueMessages]);

  const pollForNewMessages = useCallback((): void => {
    if (!issueData?.uid) return;
    getIssueMessages(issueData.uid)
      .then((fetched) => {
        const newCount = fetched.filter((m) => !visibleIdsRef.current.has(m.id)).length;
        if (newCount > 0) setPendingCount(newCount);
      })
      .catch((e: Error) => setActionError(e.message ?? 'Failed to load messages'));
  }, [issueData?.uid, getIssueMessages]);

  useEffect(() => {
    loadIssue();
  }, [loadIssue]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Track visible message IDs for polling delta
  useEffect(() => {
    visibleIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  // Polling for new messages (non-intrusive, sets pendingCount)
  useEffect(() => {
    const interval = setInterval(() => pollForNewMessages(), 15000);
    return () => clearInterval(interval);
  }, [pollForNewMessages]);

  // Scroll messages container to bottom when messages change (initial load, send, manual reload)
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function handleUpdate(): Promise<void> {
    if (!id) return;
    setIsUpdating(true);
    setActionError(undefined);
    try {
      await updateIssue(+id, {
        state: updateState || undefined,
        department: updateDepartment || undefined,
        clerk: updateClerk || undefined,
      });
      loadIssue();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleSendMessage(): Promise<void> {
    if (!id || (!messageText.trim() && selectedFiles.length === 0)) return;
    setIsSending(true);
    setActionError(undefined);
    try {
      const author = messageAuthor;
      const text = messageText.trim() || undefined;

      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const fileData = await toBase64(selectedFiles[i]);
          const isLast = i === selectedFiles.length - 1;
          await sendMessage(+id, {
            author,
            message: isLast ? text : undefined,
            file: fileData,
            fileName: selectedFiles[i].name,
          });
        }
      } else {
        await sendMessage(+id, { author, message: text });
      }

      setMessageText('');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadMessages();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setIsSending(false);
    }
  }

  async function openFile(msg: SupportMessageInfo): Promise<void> {
    if (!issueData?.uid || !msg.fileName) return;
    try {
      const { data, contentType } = await getMessageFile(issueData.uid, msg.id);
      if (!data || data.type !== 'Buffer' || !Array.isArray(data.data)) {
        setActionError('Invalid file type');
        return;
      }
      if (filePreview) URL.revokeObjectURL(filePreview.url);
      const blob = new Blob([new Uint8Array(data.data)], { type: contentType });
      const url = URL.createObjectURL(blob);
      setFilePreview({ url, contentType, name: msg.fileName });
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Error loading file');
    }
  }

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview.url);
    };
  }, [filePreview]);

  if (loadError) return <ErrorHint message={loadError} />;
  if (isLoading || !issueData) return <StyledLoadingSpinner size={SpinnerSize.LG} />;

  function handleSplitDrag(e: React.MouseEvent): void {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const onMouseMove = (moveEvent: MouseEvent): void => {
      const rect = container.getBoundingClientRect();
      const percent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(80, Math.max(30, percent)));
    };

    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  return (
    <div ref={containerRef} className="w-full flex text-left">
      <div style={{ width: `${splitPercent}%` }} className="flex flex-col gap-6 min-w-0 pr-2">
        {actionError && <ErrorHint message={actionError} />}
        {/* Info Panels - Row 1: Issue + Account */}
        <div className="flex gap-4 flex-wrap">
          <InfoPanel title="Issue Details">
            <InfoRow label="UID" value={issueData.uid} mono />
            <InfoRow label="Name" value={issueData.name} />
            <InfoRow label="Type" value={translate('screens/support', typeLabel(issueData.type))} />
            <InfoRow label="Reason" value={translate('screens/support', reasonLabel(issueData.reason))} />
            <InfoRow label="State" value={statusBadge(issueData.state)} />
            <InfoRow label="Department" value={issueData.department ?? '-'} />
            <InfoRow label="Created" value={formatDateTime(issueData.created)} />
          </InfoPanel>

          <InfoPanel title="Account Data">
            <InfoRow
              label="UserData ID"
              value={
                canAccessCompliance ? (
                  <button
                    className="text-dfxBlue-400 underline hover:text-dfxBlue-800"
                    onClick={() => navigate(`/compliance/user/${issueData.account.id}`)}
                  >
                    {issueData.account.id}
                  </button>
                ) : (
                  String(issueData.account.id)
                )
              }
            />
            <InfoRow label="Status" value={statusBadge(issueData.account.status)} />
            <InfoRow label="Verified Name" value={issueData.account.verifiedName ?? '-'} />
            <InfoRow label="DFX Name" value={issueData.account.completeName ?? '-'} />
            <InfoRow label="Account Type" value={issueData.account.accountType ?? '-'} />
            <InfoRow label="KYC Level" value={String(issueData.account.kycLevel)} />
            <InfoRow
              label="Deposit Limit"
              value={
                issueData.account.depositLimit != null ? `${issueData.account.depositLimit.toLocaleString()} CHF` : '-'
              }
            />
            <InfoRow label="Annual Volume" value={`${issueData.account.annualVolume.toLocaleString()} CHF`} />
            <InfoRow label="KYC Hash" value={issueData.account.kycHash} mono />
            <InfoRow label="Country" value={issueData.account.country?.name ?? '-'} />
            {isComplianceDept && (
              <tr>
                <td className="pr-4 py-1 font-medium whitespace-nowrap text-sm">Compliance:</td>
                <td className="py-1">
                  <button
                    className="text-xs text-dfxBlue-400 underline hover:text-dfxBlue-800"
                    onClick={() => navigate(`/compliance/user/${issueData.account.id}`)}
                  >
                    Open User
                  </button>
                </td>
              </tr>
            )}
          </InfoPanel>
        </div>

        {/* Info Panels - Row 2: Transaction + Missing + Limit */}
        {(issueData.transaction || issueData.transactionMissing || issueData.limitRequest) && (
          <div className="flex gap-4 flex-wrap">
            {issueData.transaction && (
              <InfoPanel title="Transaction">
                <InfoRow label="ID" value={String(issueData.transaction.id)} />
                <InfoRow label="Source Type" value={issueData.transaction.sourceType} />
                <InfoRow label="Type" value={issueData.transaction.type} />
                {issueData.transaction.amlCheck && (
                  <InfoRow label="AML Check" value={statusBadge(issueData.transaction.amlCheck)} />
                )}
                {issueData.transaction.amlReason && (
                  <InfoRow label="AML Reason" value={issueData.transaction.amlReason} />
                )}
                {issueData.transaction.comment && <InfoRow label="Comment" value={issueData.transaction.comment} />}
                {issueData.transaction.inputAmount != null && (
                  <InfoRow
                    label="Input"
                    value={`${issueData.transaction.inputAmount} ${issueData.transaction.inputAsset ?? ''}`}
                  />
                )}
                {issueData.transaction.outputAmount != null && (
                  <InfoRow
                    label="Output"
                    value={`${issueData.transaction.outputAmount} ${issueData.transaction.outputAsset ?? ''}`}
                  />
                )}
                {issueData.transaction.wallet && <InfoRow label="Wallet" value={issueData.transaction.wallet.name} />}
                {issueData.transaction.isComplete != null && (
                  <InfoRow label="Complete" value={issueData.transaction.isComplete ? 'Yes' : 'No'} />
                )}
              </InfoPanel>
            )}

            {issueData.transactionMissing && (
              <InfoPanel title="Transaction Missing">
                {issueData.transactionMissing.senderIban && (
                  <InfoRow label="Sender IBAN" value={issueData.transactionMissing.senderIban} mono />
                )}
                {issueData.transactionMissing.receiverIban && (
                  <InfoRow label="Receiver IBAN" value={issueData.transactionMissing.receiverIban} mono />
                )}
                {issueData.transactionMissing.date && (
                  <InfoRow label="Date" value={formatDateTime(issueData.transactionMissing.date)} />
                )}
              </InfoPanel>
            )}

            {issueData.limitRequest && (
              <InfoPanel title="Limit Request">
                <InfoRow label="Requested" value={`${issueData.limitRequest.limit.toLocaleString()} CHF`} />
                {issueData.limitRequest.acceptedLimit != null && (
                  <InfoRow label="Accepted" value={`${issueData.limitRequest.acceptedLimit.toLocaleString()} CHF`} />
                )}
                <InfoRow label="Fund Origin" value={issueData.limitRequest.fundOrigin} />
                <InfoRow label="Investment Date" value={issueData.limitRequest.investmentDate} />
                {issueData.limitRequest.decision && (
                  <InfoRow label="Decision" value={statusBadge(issueData.limitRequest.decision)} />
                )}
              </InfoPanel>
            )}
          </div>
        )}

        {/* Update Controls */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-dfxGray-700 mb-3">Update Issue</h2>
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-dfxGray-700">State</label>
              <select
                className="px-2 py-1.5 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800 min-w-[130px]"
                value={updateState}
                onChange={(e) => setUpdateState(e.target.value)}
              >
                {Object.values(SupportIssueInternalState).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-dfxGray-700">Department</label>
              <select
                className="px-2 py-1.5 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800 min-w-[130px]"
                value={updateDepartment}
                onChange={(e) => setUpdateDepartment(e.target.value)}
              >
                {!issueData?.department && <option value="">-</option>}
                {ASSIGNABLE_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-dfxGray-700">Clerk</label>
              <select
                className="px-2 py-1.5 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800 min-w-[130px]"
                value={updateClerk}
                onChange={(e) => setUpdateClerk(e.target.value)}
              >
                {!issueData?.clerk && <option value="">-</option>}
                {clerks.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="px-4 py-1.5 bg-dfxBlue-400 text-white rounded text-xs hover:bg-dfxBlue-800 transition-colors disabled:opacity-50"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>

        {/* Messages / Chat */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-dfxGray-700">Messages ({messages.length})</h2>
            {pendingCount > 0 && (
              <button
                className="px-3 py-1 text-xs text-white bg-dfxRed-100 rounded-full hover:bg-dfxRed-150 transition-colors"
                onClick={() => loadMessages()}
              >
                {pendingCount} new {pendingCount === 1 ? 'message' : 'messages'} — load
              </button>
            )}
          </div>
          <div
            ref={messagesContainerRef}
            className="flex flex-col gap-2 max-h-[40vh] overflow-auto mb-4 p-2 scroll-shadow"
          >
            {[...messages]
              .sort((a, b) => a.id - b.id)
              .map((msg) => {
                const isCustomer = msg.author === CustomerAuthor;
                return (
                  <div key={msg.id} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isCustomer
                          ? 'bg-dfxGray-300 text-dfxBlue-800'
                          : 'bg-dfxBlue-800/10 text-dfxBlue-800 border border-dfxBlue-800/20'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-4 mb-1">
                        <span className="text-xs font-medium">{msg.author}</span>
                        <span className="text-xs opacity-70">{formatDateTime(msg.created)}</span>
                      </div>
                      <div className="text-sm">{msg.message || '-'}</div>
                      {msg.fileName && (
                        <button
                          className="text-xs mt-1 text-dfxBlue-400 underline hover:text-dfxBlue-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFile(msg);
                          }}
                        >
                          {msg.fileName}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Message Input */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 bg-dfxGray-300 rounded text-xs text-dfxBlue-800"
                >
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    className="text-dfxGray-700 hover:text-dfxRed-100"
                    onClick={() => {
                      setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
            />
            <button
              className="px-2 py-2 text-dfxGray-700 hover:text-dfxBlue-800 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              &#128206;
            </button>
            <input
              className="flex-1 px-3 py-2 text-sm border border-dfxGray-400 rounded bg-white text-dfxBlue-800"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <select
              className="px-2 py-2 text-xs border border-dfxGray-400 rounded bg-white text-dfxBlue-800"
              value={messageAuthor}
              onChange={(e) => setMessageAuthor(e.target.value)}
              title="Author"
            >
              {clerks.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              className="px-4 py-2 bg-dfxBlue-400 text-white rounded text-sm hover:bg-dfxBlue-800 transition-colors disabled:opacity-50"
              onClick={handleSendMessage}
              disabled={isSending || (!messageText.trim() && selectedFiles.length === 0)}
            >
              {isSending ? '...' : 'Send'}
            </button>
          </div>
          <div className="text-xs text-dfxGray-700 mt-1">
            Customer will be notified by email when you send a message.
          </div>
        </div>
      </div>

      {/* Draggable Splitter */}
      <div className="w-1.5 cursor-col-resize flex-shrink-0 group flex items-stretch" onMouseDown={handleSplitDrag}>
        <div className="w-0.5 mx-auto bg-dfxGray-400 group-hover:bg-dfxBlue-400 transition-colors rounded-full" />
      </div>

      {/* File Preview - always visible, sticky right */}
      <div style={{ width: `${100 - splitPercent}%` }} className="min-w-0 sticky top-4 self-start pl-2">
        <FilePreviewPanel
          preview={filePreview}
          label="File Preview"
          onClose={() => {
            if (filePreview) URL.revokeObjectURL(filePreview.url);
            setFilePreview(undefined);
          }}
        />
      </div>
    </div>
  );
}

// --- Sub-components ---

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex-1 min-w-[250px]">
      <h2 className="text-dfxGray-700 mb-3">{title}</h2>
      <table className="text-sm text-dfxBlue-800 text-left">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | JSX.Element; mono?: boolean }): JSX.Element {
  return (
    <tr>
      <td className="pr-4 py-1 font-medium whitespace-nowrap text-sm">{label}:</td>
      <td className={`py-1 text-sm break-all ${mono ? 'font-mono' : ''}`}>{value}</td>
    </tr>
  );
}
