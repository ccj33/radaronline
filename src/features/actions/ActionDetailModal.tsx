import React, { useState, useCallback, useRef } from 'react';
import { Action, RaciRole, TeamMember, ActionComment } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { useResponsive } from '../../hooks/useResponsive';
import { ActionDetailCommentsPanel } from './detail/ActionDetailCommentsPanel';
import { ActionDetailFooter } from './detail/ActionDetailFooter';
import { ActionDetailHeader } from './detail/ActionDetailHeader';
import { ActionDetailMobileTabs } from './detail/ActionDetailMobileTabs';
import { ActionDetailMetaBar } from './detail/ActionDetailMetaBar';
import { ActionDetailMobileRaciSection } from './detail/ActionDetailMobileRaciSection';
import { getDerivedActionStatus } from '../../lib/actionPortfolio';
import { actionDetailStatusColors } from './detail/actionDetail.constants';
import { useActionDetailComments } from './hooks/useActionDetailComments';
import { useActionDetailDialogs } from './hooks/useActionDetailDialogs';
import { useActionDetailDraft } from './hooks/useActionDetailDraft';
import { useActionDetailTags } from './hooks/useActionDetailTags';
import { useThreadedComments } from './hooks/useThreadedComments';

// =====================================
// PROPS DO COMPONENTE
// =====================================
interface ActionDetailModalProps {
    isOpen: boolean;
    action: Action | null;
    team: TeamMember[];
    activityName?: string;
    onClose: () => void;
    onUpdateAction?: (uid: string, field: string, value: string | number) => void;
    onSaveAction?: (uid?: string) => void;
    onSaveFullAction?: (action: Action) => void; // New prop for draft mode save
    onDeleteAction: (uid: string) => void;
    onAddRaci?: (uid: string, memberId: string, role: RaciRole) => void;
    onRemoveRaci?: (uid: string, idx: number, memberName: string) => void;
    onAddComment?: (
        uid: string,
        content: string,
        parentId?: string | null
    ) => Promise<ActionComment | null | void> | ActionComment | null | void;
    onEditComment?: (actionUid: string, commentId: string, content: string) => void;
    onDeleteComment?: (actionUid: string, commentId: string) => void;
    onSaveAndNew?: (updatedAction: Action) => Promise<void>;
    isSaving?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    readOnly?: boolean;
}


// =====================================
// COMPONENTE PRINCIPAL
// =====================================
export const ActionDetailModal: React.FC<ActionDetailModalProps> = ({
    isOpen,
    action: initialAction,
    team,
    activityName = 'Atividade',
    onClose,
    onUpdateAction: _onUpdateAction,
    onSaveFullAction, // Nova prop para salvar o objeto completo
    isSaving = false,
    canEdit = true,
    onDeleteAction, // Adicionado de volta para uso no botao Excluir
    onAddComment,
    canDelete = true,
    readOnly = false,
    onSaveAndNew,
}) => {
    const { user, isAdmin, isSuperAdmin } = useAuth();
    const { isMobile } = useResponsive();

    const [mobileSection, setMobileSection] = useState<'details' | 'raci' | 'comments'>('details');
    const {
        draftAction,
        setDraftAction,
        isDirty,
        setIsDirty,
        isSavingAndNew,
        ruleErrors,
        uiState,
        reopenConfig,
        updateDraftField,
        handleFieldChange,
        confirmReopen,
        cancelReopen,
        setDateShortcut,
        handleSaveDirty,
        handleSaveAndNewDirty,
    } = useActionDetailDraft({
        initialAction,
        isOpen,
        onSaveFullAction,
        onSaveAndNew,
    });

    const [selectedRaciMemberId, setSelectedRaciMemberId] = useState('');
    const [newRaciRole, setNewRaciRole] = useState<RaciRole>('R');
    const [showRaciPopover, setShowRaciPopover] = useState(false);

    const modalRef = useRef<HTMLDivElement>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);

    const userCanEdit = !readOnly && canEdit;
    const userCanDelete = !readOnly && canDelete;
    const {
        showTagPopover,
        setShowTagPopover,
        availableTags,
        newTagName,
        setNewTagName,
        isLoadingTags,
        tagToDelete,
        setTagToDelete,
        tagStatusMsg,
        toggleTagSelection,
        handleCreateTag,
        handleDeleteTag,
        confirmDeleteTag,
        handleToggleFavorite,
    } = useActionDetailTags({
        draftAction,
        setDraftAction,
        setIsDirty,
    });
    const {
        commentDraft,
        setCommentDraft,
        filteredMentions,
        handleAddComment,
        handleCommentChange,
        handleCommentKeyDown,
        handleEditComment,
        handleReply,
        mentionIndex,
        replyingTo,
        selectMention,
        setReplyingTo,
        showMentions,
    } = useActionDetailComments({
        team,
        user,
        draftAction,
        setDraftAction,
        setIsDirty,
        onAddComment,
        commentInputRef,
    });
    const {
        closeConfirmModal,
        confirmConfig,
        handleCloseDirty,
        handleDeleteComment,
    } = useActionDetailDialogs({
        isDirty,
        isOpen,
        onClose,
        onSaveShortcut: handleSaveDirty,
        setDraftAction,
        setIsDirty,
        userCanEdit,
    });

    // Raci Add (Local)
    const handleAddRaci = useCallback(() => {
        if (!selectedRaciMemberId || !draftAction) return;
        const member = team.find(t => t.id === selectedRaciMemberId);
        if (!member) return;

        updateDraftField('raci', [...draftAction.raci, { name: member.name, role: newRaciRole }]);
        setSelectedRaciMemberId('');
        setNewRaciRole('R');
        setShowRaciPopover(false);
    }, [draftAction, newRaciRole, selectedRaciMemberId, team, updateDraftField]);

    // Raci Remove (Local)
    const handleRemoveRaci = useCallback((index: number) => {
        if (!draftAction) return;
        const newRaci = [...draftAction.raci];
        newRaci.splice(index, 1);
        updateDraftField('raci', newRaci);
    }, [draftAction, updateDraftField]);

    const threadedComments = useThreadedComments(draftAction?.comments || []);

    // Alias for JSX compatibility (Logic Source of Truth)
    const action = draftAction;
    if (!isOpen || !action) return null;

    const displayStatus = getDerivedActionStatus(action);
    const currentStatus = actionDetailStatusColors[displayStatus] || actionDetailStatusColors['N\u00E3o Iniciado'];

    return (
        <div
            className="fixed inset-0 z-[80] flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-detail-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleCloseDirty}
                aria-hidden="true"
            />

            {/* Drawer - Fullscreen on mobile, side drawer on desktop */}
            <div
                ref={modalRef}
                className={`relative h-full bg-slate-50 dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden
                    ${isMobile
                        ? 'w-full animate-slide-in-up safe-area-bottom'
                        : 'w-full max-w-2xl animate-slide-in-right'
                    }`}
            >
                <ConfirmModal
                    isOpen={reopenConfig.isOpen}
                    title="Reabrir AÃ§Ã£o?"
                    message="Esta aÃ§Ã£o estÃ¡ concluÃ­da com Data Fim preenchida. Para fazer essa alteraÃ§Ã£o, a aÃ§Ã£o serÃ¡ reaberta e a Data Fim removida."
                    confirmText="Reabrir e Alterar"
                    cancelText="Manter ConcluÃ­da"
                    onConfirm={confirmReopen}
                    onCancel={cancelReopen}
                    type="warning"
                />

                <ActionDetailHeader
                    action={action}
                    activityName={activityName}
                    userCanEdit={userCanEdit}
                    onClose={handleCloseDirty}
                    onTitleChange={(title) => updateDraftField('title', title)}
                />

                {/* Mobile Section Tabs */}
                {isMobile && (
                    <ActionDetailMobileTabs
                        action={action}
                        mobileSection={mobileSection}
                        onSectionChange={setMobileSection}
                    />
                )}

                <ActionDetailMetaBar
                    action={action}
                    displayStatus={displayStatus}
                    currentStatus={currentStatus}
                    draftMicroregiaoId={draftAction?.microregiaoId}
                    isMobile={isMobile}
                    mobileSection={mobileSection}
                    userCanEdit={userCanEdit}
                    ruleErrors={ruleErrors}
                    uiState={uiState}
                    team={team}
                    selectedRaciMemberId={selectedRaciMemberId}
                    setSelectedRaciMemberId={setSelectedRaciMemberId}
                    newRaciRole={newRaciRole}
                    setNewRaciRole={setNewRaciRole}
                    showRaciPopover={showRaciPopover}
                    setShowRaciPopover={setShowRaciPopover}
                    showTagPopover={showTagPopover}
                    setShowTagPopover={setShowTagPopover}
                    availableTags={availableTags}
                    newTagName={newTagName}
                    setNewTagName={setNewTagName}
                    isLoadingTags={isLoadingTags}
                    tagToDelete={tagToDelete}
                    setTagToDelete={setTagToDelete}
                    tagStatusMsg={tagStatusMsg}
                    updateDraftField={updateDraftField}
                    handleFieldChange={handleFieldChange}
                    setDateShortcut={setDateShortcut}
                    handleCreateTag={handleCreateTag}
                    handleDeleteTag={handleDeleteTag}
                    confirmDeleteTag={confirmDeleteTag}
                    handleToggleFavorite={handleToggleFavorite}
                    toggleTagSelection={toggleTagSelection}
                    handleAddRaci={handleAddRaci}
                />

                {/* Confirmation Modal */}
                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    confirmType={confirmConfig.type}
                    confirmText={confirmConfig.confirmText}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={closeConfirmModal}
                />

                {isMobile && mobileSection === 'raci' && (
                    <ActionDetailMobileRaciSection
                        action={action}
                        team={team}
                        userCanEdit={userCanEdit}
                        ruleErrors={ruleErrors}
                        selectedRaciMemberId={selectedRaciMemberId}
                        setSelectedRaciMemberId={setSelectedRaciMemberId}
                        newRaciRole={newRaciRole}
                        setNewRaciRole={setNewRaciRole}
                        handleAddRaci={handleAddRaci}
                        handleRemoveRaci={handleRemoveRaci}
                    />
                )}

                {/* =========================================
            3. CORPO PRINCIPAL - COMENTÃRIOS
        ========================================= */}

                <ActionDetailCommentsPanel
                    action={action}
                    commentDraft={commentDraft}
                    commentInputRef={commentInputRef}
                    filteredMentions={filteredMentions}
                    handleAddComment={handleAddComment}
                    handleCommentChange={handleCommentChange}
                    handleCommentKeyDown={handleCommentKeyDown}
                    handleDeleteComment={handleDeleteComment}
                    handleEditComment={handleEditComment}
                    handleReply={handleReply}
                    isAdmin={isAdmin}
                    isMobile={isMobile}
                    isSuperAdmin={isSuperAdmin}
                    mentionIndex={mentionIndex}
                    mobileSection={mobileSection}
                    readOnly={readOnly}
                    replyingTo={replyingTo}
                    selectMention={selectMention}
                    setCommentDraft={setCommentDraft}
                    setReplyingTo={setReplyingTo}
                    showMentions={showMentions}
                    threadedComments={threadedComments}
                    user={user}
                    userCanEdit={userCanEdit}

                />
                {/* =========================================
                   FOOTER FIXO - AÃ§Ãµes Principais
                ========================================= */}
                <ActionDetailFooter
                    action={action}
                    draftAction={draftAction}
                    handleCloseDirty={handleCloseDirty}
                    handleSaveAndNewDirty={handleSaveAndNewDirty}
                    handleSaveDirty={handleSaveDirty}
                    isSaving={isSaving}
                    isSavingAndNew={isSavingAndNew}
                    onDeleteAction={onDeleteAction}
                    onSaveAndNew={onSaveAndNew}
                    ruleErrors={ruleErrors}
                    userCanDelete={userCanDelete}
                    userCanEdit={userCanEdit}
                />
            </div>
        </div>
    );
};

export default ActionDetailModal;















