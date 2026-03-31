import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../components/common/Toast";
import { isAdminLike } from "../../../lib/authHelpers";
import {
  deleteUserRequest,
  loadManagedRequests,
  subscribeToUserRequests,
  unsubscribeFromUserRequests,
  updateUserRequest,
  type RequestStatus,
  type UserRequest,
} from "../../../services/requestsService";
import { RequestDeleteModal } from "./requestsManagement/RequestDeleteModal";
import { RequestDetailModal } from "./requestsManagement/RequestDetailModal";
import { RequestsManagementFilters } from "./requestsManagement/RequestsManagementFilters";
import { RequestsManagementHeader } from "./requestsManagement/RequestsManagementHeader";
import { RequestsManagementPagination } from "./requestsManagement/RequestsManagementPagination";
import { RequestsManagementTable } from "./requestsManagement/RequestsManagementTable";
import type { StatusFilter, TypeFilter } from "./requestsManagement/requestsManagement.types";

function dedupeRequestsById(items: UserRequest[]): UserRequest[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

export function RequestsManagement() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [microFilter, setMicroFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const pageSize = 20;
  const isAdmin = isAdminLike(user?.role);
  const isSuperAdmin = user?.role === "superadmin";

  const loadRequests = useCallback(async () => {
    if (!user || !isAdmin) return;

    setLoading(true);
    try {
      const { data, totalCount: count, error } = await loadManagedRequests({
        page,
        pageSize,
        statusFilter,
        typeFilter,
        includeProfileDetails: true,
      });

      if (error) {
        showToast("Erro ao carregar solicitações", "error");
        setRequests([]);
        setTotalCount(0);
        return;
      }

      setRequests(dedupeRequestsById(data));
      setTotalCount(count);
    } catch {
      showToast("Erro inesperado ao carregar solicitações", "error");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, pageSize, showToast, statusFilter, typeFilter, user]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const loadRequestsRef = useRef(loadRequests);
  useEffect(() => {
    loadRequestsRef.current = loadRequests;
  }, [loadRequests]);

  useEffect(() => {
    if (!user?.id || !isAdmin) return;

    const channel = subscribeToUserRequests({
      channelName: "requests_management_changes",
      userId: user.id,
      isAdmin,
      onChange: () => {
        loadRequestsRef.current?.();
      },
    });

    return () => {
      unsubscribeFromUserRequests(channel);
    };
  }, [isAdmin, user?.id]);

  const filteredRequests = useMemo(() => {
    let result = requests;

    if (microFilter !== "all") {
      result = result.filter((request) => request.user?.microregiao_id === microFilter);
    }

    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.toLowerCase();
      result = result.filter(
        (request) =>
          request.content.toLowerCase().includes(normalizedQuery) ||
          request.user?.nome?.toLowerCase().includes(normalizedQuery) ||
          request.user?.email?.toLowerCase().includes(normalizedQuery),
      );
    }

    return result;
  }, [microFilter, requests, searchQuery]);

  const handleUpdate = useCallback(
    async (requestId: string, status: RequestStatus, note?: string) => {
      setSaving(true);
      try {
        const { success } = await updateUserRequest({
          requestId,
          status,
          adminNotes: note,
          resolvedById: user?.id,
        });

        if (!success) {
          showToast("Erro ao atualizar solicitação", "error");
          return;
        }

        showToast("Solicitação atualizada!", "success");
        setSelectedRequest(null);
        setAdminNote("");
        await loadRequests();
      } catch {
        showToast("Erro inesperado", "error");
      } finally {
        setSaving(false);
      }
    },
    [loadRequests, showToast, user?.id],
  );

  const handleDelete = useCallback(
    async (requestId: string) => {
      setSaving(true);
      try {
        const { success } = await deleteUserRequest(requestId);

        if (!success) {
          showToast("Erro ao excluir solicitação", "error");
          return;
        }

        showToast("Solicitação excluída com sucesso!", "success");
        setSelectedRequest(null);
        setDeleteConfirmId(null);
        await loadRequests();
      } catch {
        showToast("Erro inesperado ao excluir", "error");
      } finally {
        setSaving(false);
      }
    },
    [loadRequests, showToast],
  );

  const handleOpenRequest = useCallback((request: UserRequest) => {
    setSelectedRequest(request);
    setAdminNote(request.admin_notes || "");
  }, []);

  const handleStatusFilterChange = useCallback((value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleTypeFilterChange = useCallback((value: TypeFilter) => {
    setTypeFilter(value);
    setPage(1);
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize);
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const resolvedCount = requests.filter((request) => request.status === "resolved").length;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[60vh] bg-slate-50 dark:bg-slate-900 overflow-visible md:overflow-hidden">
      <RequestsManagementHeader pendingCount={pendingCount} resolvedCount={resolvedCount} totalCount={totalCount} />

      <RequestsManagementFilters
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        microFilter={microFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onMicroFilterChange={setMicroFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onTypeFilterChange={handleTypeFilterChange}
        onRefresh={loadRequests}
      />

      <RequestsManagementTable loading={loading} requests={filteredRequests} onOpenRequest={handleOpenRequest} />

      <RequestsManagementPagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        onPreviousPage={() => setPage((previous) => Math.max(1, previous - 1))}
        onNextPage={() => setPage((previous) => Math.min(totalPages, previous + 1))}
      />

      <AnimatePresence>
        {selectedRequest ? (
          <RequestDetailModal
            request={selectedRequest}
            adminNote={adminNote}
            saving={saving}
            isSuperAdmin={isSuperAdmin}
            onAdminNoteChange={setAdminNote}
            onClose={() => setSelectedRequest(null)}
            onUpdate={handleUpdate}
            onRequestDelete={setDeleteConfirmId}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmId ? (
          <RequestDeleteModal saving={saving} onClose={() => setDeleteConfirmId(null)} onConfirm={() => handleDelete(deleteConfirmId)} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
