import {
  AtSign,
  Check,
  Clock,
  FileText,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  Shield,
  User as UserIcon,
  XCircle,
} from "lucide-react";

import type { RequestStatus, UserRequest } from "../../../../services/requestsService";

export function getRequestStatusBadge(status: RequestStatus) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Clock size={12} /> Pendente
      </span>
    );
  }

  if (status === "resolved") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <Check size={12} /> Resolvido
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <XCircle size={12} /> Rejeitado
      </span>
    );
  }

  return null;
}

export function getRequestTypeBadge(type: UserRequest["request_type"]) {
  if (type === "request") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
        <FileText size={10} /> Solicitação
      </span>
    );
  }

  if (type === "feedback") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
        <MessageSquare size={10} /> Feedback
      </span>
    );
  }

  if (type === "support") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <LifeBuoy size={10} /> Suporte
      </span>
    );
  }

  if (type === "mention") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <AtSign size={10} /> Menção
      </span>
    );
  }

  if (type === "announcement") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
        <Megaphone size={10} /> Comunicado
      </span>
    );
  }

  if (type === "profile_change") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
        <UserIcon size={10} /> Perfil
      </span>
    );
  }

  if (type === "system") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
        <Shield size={10} /> Sistema
      </span>
    );
  }

  return <span className="text-[10px] text-slate-500">{type}</span>;
}

export function getRoleBadgeClassName(role?: string) {
  return role === "superadmin" || role === "admin"
    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
}

export function getRoleLabel(role?: string) {
  if (role === "superadmin") return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "gestor") return "Gestor";
  return "Usuário";
}
