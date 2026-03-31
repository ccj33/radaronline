import { Check, RotateCcw, Trash2, X, XCircle } from "lucide-react";
import { motion } from "framer-motion";

import type { UserRequest } from "../../../../services/requestsService";

import { getRequestStatusBadge, getRequestTypeBadge } from "./requestsManagement.utils";

interface RequestDetailModalProps {
  request: UserRequest;
  adminNote: string;
  saving: boolean;
  isSuperAdmin: boolean;
  onAdminNoteChange: (value: string) => void;
  onClose: () => void;
  onUpdate: (requestId: string, status: "pending" | "resolved" | "rejected", note?: string) => void;
  onRequestDelete: (requestId: string) => void;
}

export function RequestDetailModal({
  request,
  adminNote,
  saving,
  isSuperAdmin,
  onAdminNoteChange,
  onClose,
  onUpdate,
  onRequestDelete,
}: RequestDetailModalProps) {
  const requesterLabel = request.user?.nome || 'Usuário';
  const responderLabel = request.resolved_by_name || 'Administrador';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full sm:max-w-xl bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] sm:max-h-[85vh]"
      >
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
              {(request.user?.nome || "U")[0].toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-800 dark:text-white">{requesterLabel}</div>
              <div className="text-xs text-slate-500">{request.user?.email}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(92dvh-74px)] sm:max-h-[calc(85vh-74px)]">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {getRequestTypeBadge(request.request_type)}
            {getRequestStatusBadge(request.status)}
            <span className="text-xs text-slate-400">{new Date(request.created_at).toLocaleString("pt-BR")}</span>
            {request.status !== "pending" ? (
              <span className="text-xs text-slate-500">Respondido por: {responderLabel}</span>
            ) : null}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap">{request.content}</p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resposta / Observação</label>
            <textarea
              value={adminNote}
              onChange={(event) => onAdminNoteChange(event.target.value)}
              placeholder="Digite sua resposta ou observação..."
              rows={3}
              className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            {request.status !== "pending" ? (
              <button
                onClick={() => onUpdate(request.id, "pending", adminNote)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors"
              >
                <RotateCcw size={14} /> Reabrir
              </button>
            ) : null}
            {request.status !== "rejected" ? (
              <button
                onClick={() => onUpdate(request.id, "rejected", adminNote)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <XCircle size={14} /> Rejeitar
              </button>
            ) : null}
            {request.status !== "resolved" ? (
              <button
                onClick={() => onUpdate(request.id, "resolved", adminNote)}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
              >
                {saving ? "Salvando..." : "Resolver"}
                <Check size={14} />
              </button>
            ) : null}
          </div>

          {isSuperAdmin ? (
            <div className="flex justify-start border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
              <button
                onClick={() => onRequestDelete(request.id)}
                disabled={saving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 rounded-lg transition-colors"
              >
                <Trash2 size={14} /> Excluir permanentemente
              </button>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
