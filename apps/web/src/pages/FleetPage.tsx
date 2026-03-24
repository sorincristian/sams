import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Bus, Garage } from "@sams/types";
import { FleetStatsWidget } from "../components/FleetStatsWidget";
import { BusImportWizard } from "../components/BusImportWizard";
import { PageContainer, PageHeader } from "../components/shared/Page";
import { SectionCard } from "../components/shared/Card";
import { Button } from "../components/shared/Button";
import { DataTable } from "../components/shared/DataTable";
import { StatusBadge } from "../components/shared/StatusBadge";
import { FormField } from "../components/shared/Form";
import { LoadingState, ErrorState, EmptyState } from "../components/shared/States";
import "./FleetPage.css";

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function FleetPage() {
  // State
  const [buses, setBuses] = useState<Bus[]>([]);
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loadingBuses, setLoadingBuses] = useState(false);
  
  // Filters & Pagination
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Initialize state synchronously from URL to prevent race conditions on mount
  const [garageIdFilter, setGarageIdFilter] = useState(() => {
    return new URLSearchParams(location.search).get("garageId") || "";
  });

  // Sync state if URL changes externally (e.g., Back button)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setGarageIdFilter(params.get("garageId") || "");
  }, [location.search]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [apiError, setApiError] = useState(false);

  // Modals / Edit state
  const [isBusModalOpen, setIsBusModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [addingBus, setAddingBus] = useState<Partial<Bus> | null>(null);
  
  // Inline editing state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [inlineEditForm, setInlineEditForm] = useState<Partial<Bus>>({});

  // Feedback state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchGarages = useCallback(async () => {
    try {
      const res = await api.get("/garages");
      // Sorted alphabetically as requested by default, defensively check array
      const items = Array.isArray(res.data) ? res.data : [];
      const sorted = items.slice().sort((a: Garage, b: Garage) => (a.name || "").localeCompare(b.name || ""));
      setGarages(sorted);
    } catch (err) {
      console.error("Failed to fetch garages", err);
    }
  }, []);

  const fetchBuses = useCallback(async () => {
    setLoadingBuses(true);
    let url = `/buses?page=${page}&pageSize=${pageSize}`;
    if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
    if (garageIdFilter) url += `&garageId=${encodeURIComponent(garageIdFilter)}`;
    try {
      setApiError(false);
      const res = await api.get(url);
      
      const items = res.data?.items;
      if (Array.isArray(items)) {
        setBuses(items);
        setTotal(res.data.total || 0);
        
        // Ensure page isn't out of bounds if search results change
        if (res.data.page > 1 && items.length === 0) {
          setPage(1);
        } else {
          setPage(res.data.page || 1);
        }
      } else {
        setApiError(true);
        setBuses([]);
      }
    } catch (err) {
      console.error("Failed to fetch buses", err);
      setApiError(true);
      setBuses([]);
    } finally {
      setLoadingBuses(false);
    }
  }, [page, pageSize, debouncedSearch, garageIdFilter]);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  // Reset page to 1 when search or garage filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, garageIdFilter]);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Bus Flow - Inline Edits
  const startInlineEdit = (bus: Bus) => {
    setEditingRowId(bus.id);
    setInlineEditForm({
      model: bus.model,
      manufacturer: bus.manufacturer,
      garageId: bus.garageId,
      status: bus.status
    });
  };

  const saveInlineEdit = async (id: string) => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.put(`/buses/${id}`, inlineEditForm);
      showSuccess("Bus updated successfully");
      setEditingRowId(null);
      fetchBuses();
    } catch (err: any) {
      showError(err.response?.data?.message || err.response?.data?.error || "Failed to update bus");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post("/buses", addingBus);
      showSuccess("Bus created successfully");
      setPage(1); // Reset to page 1 to see new bus
      fetchBuses();
      setIsBusModalOpen(false);
      setAddingBus(null);
    } catch (err: any) {
      showError(err.response?.data?.message || err.response?.data?.error || "Failed to create bus");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBus = async (id: string, fleetNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete bus ${fleetNumber}?`)) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await api.delete(`/buses/${id}`);
      showSuccess(`Bus ${fleetNumber} deleted`);
      fetchBuses();
    } catch (err: any) {
      showError(err.response?.data?.message || err.response?.data?.error || "Failed to delete bus");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const busItems = Array.isArray((buses as any)?.items) ? (buses as any).items : (Array.isArray(buses) ? buses : []);
  const garageItems = Array.isArray(garages) ? garages : [];
  const totalItems = typeof (buses as any)?.total === "number" ? (buses as any).total : (typeof total === "number" ? total : 0);

  if (loadingBuses && busItems.length === 0) return <PageContainer><LoadingState message="Loading fleet roster..." /></PageContainer>;
  if (apiError && busItems.length === 0) return <PageContainer><ErrorState message="Failed to load fleet data. Please try again." onRetry={fetchBuses} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title="Fleet Management">
        <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>
          Bulk Import
        </Button>
        <Button variant="primary" onClick={() => { setAddingBus({ status: "ACTIVE" }); setIsBusModalOpen(true); }}>
          Add Bus
        </Button>
      </PageHeader>

      {/* <FleetStatsWidget /> */}

      {errorMsg && <div className="toast toast-error">{errorMsg}</div>}
      {successMsg && <div className="toast toast-success">{successMsg}</div>}

      <SectionCard title="Filters & Actions" action={null}>
        <div className="filters-row">
          <input
            type="text"
            placeholder="Search by fleet number, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-input search-input"
          />
          <select
            value={garageIdFilter}
            onChange={(e) => {
              const val = e.target.value;
              const params = new URLSearchParams(location.search);
              if (val) {
                params.set("garageId", val);
              } else {
                params.delete("garageId");
              }
              navigate(`${location.pathname}?${params.toString()}`);
            }}
            className="filter-input"
          >
            <option value="">All garages</option>
            {garageItems.map((g: any) => (
              <option key={g.id} value={g.id}>{g?.name ?? "Unknown Garage"}</option>
            ))}
          </select>
        </div>
      </SectionCard>

      <SectionCard title="Fleet Roster" action={
        !loadingBuses && total > 0 && (
          <div className="pagination">
            <span className="text-muted u-mr-12">Page {page} of {totalPages} ({total} total)</span>
            <div className="u-flex u-gap-8">
              <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)} variant="secondary">Previous</Button>
              <Button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} variant="secondary">Next</Button>
            </div>
          </div>
        )
      }>
        <div className="table-responsive">
          <DataTable headers={["Fleet #", "Model", "Manufacturer", "Garage", "Status", "Actions"]}>
              {loadingBuses ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
              ) : apiError ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#dc2626" }}>Error loading fleet data. Please try again.</td></tr>
              ) : busItems.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>No buses found.</td></tr>
              ) : (
                busItems.map((bus: any) => (
                  <tr key={bus?.id} className={editingRowId === bus?.id ? "editing-row" : ""}>
                    <td>
                      <a href={`/fleet/buses/${bus.id}`} className="resource-link">
                        {bus.fleetNumber}
                      </a>
                    </td>
                    {editingRowId === bus.id ? (
                      <>
                        <td><input type="text" className="filter-input" value={inlineEditForm.model || ""} onChange={e => setInlineEditForm({...inlineEditForm, model: e.target.value})} disabled={submitting} /></td>
                        <td><input type="text" className="filter-input" value={inlineEditForm.manufacturer || ""} onChange={e => setInlineEditForm({...inlineEditForm, manufacturer: e.target.value})} disabled={submitting} /></td>
                        <td>
                          <select className="filter-input" value={inlineEditForm.garageId || ""} onChange={e => setInlineEditForm({...inlineEditForm, garageId: e.target.value})} disabled={submitting}>
                            {garageItems.map((g: any) => <option key={g.id} value={g.id}>{g?.name ?? "Unknown"}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="filter-input" value={inlineEditForm.status || ""} onChange={e => setInlineEditForm({...inlineEditForm, status: e.target.value})} disabled={submitting}>
                             <option value="ACTIVE">ACTIVE</option>
                             <option value="MAINTENANCE">MAINTENANCE</option>
                             <option value="RETIRED">RETIRED</option>
                          </select>
                        </td>
                        <td>
                          <button onClick={() => saveInlineEdit(bus.id)} className="btn btn-sm btn-primary" disabled={submitting}>Save</button>
                          <button onClick={() => setEditingRowId(null)} className="btn btn-sm btn-secondary u-ml-4" disabled={submitting}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{bus?.model ?? "—"}</td>
                        <td>{bus?.manufacturer ?? "—"}</td>
                        <td>{bus?.garage?.name ?? "—"}</td>
                        <td>
                          <StatusBadge 
                            status={bus?.status || "ACTIVE"} 
                            variant={(bus?.status === "MAINTENANCE") ? "warning" : (bus?.status === "RETIRED" ? "neutral" : "success")} 
                          />
                        </td>
                        <td className="u-flex u-gap-8 u-border-none">
                          <Button onClick={() => startInlineEdit(bus)} variant="secondary" disabled={submitting || editingRowId !== null}>Edit</Button>
                          <Button onClick={() => handleDeleteBus(bus.id, bus.fleetNumber)} variant="secondary" disabled={submitting || editingRowId !== null}>
                            <span className="color-danger text-danger">Delete</span>
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
          </DataTable>
        </div>
      </SectionCard>


      {/* Add Bus Modal */}
      {isBusModalOpen && (
        <div className="modal-backdrop">
          <div className="shared-modal-container">
            <SectionCard title="Add New Bus">
              <form onSubmit={handleSaveAddBus}>
                <FormField label="Fleet Number" required>
                  <input required type="text" className="filter-input" value={addingBus?.fleetNumber || ""} onChange={e => setAddingBus({ ...addingBus, fleetNumber: e.target.value })} disabled={submitting} />
                </FormField>
                <FormField label="Model" required>
                  <input required type="text" className="filter-input" value={addingBus?.model || ""} onChange={e => setAddingBus({ ...addingBus, model: e.target.value })} disabled={submitting} />
                </FormField>
                <FormField label="Manufacturer" required>
                  <input required type="text" className="filter-input" value={addingBus?.manufacturer || ""} onChange={e => setAddingBus({ ...addingBus, manufacturer: e.target.value })} disabled={submitting} />
                </FormField>
                <FormField label="Garage" required>
                  <select required className="filter-input" value={addingBus?.garageId || ""} onChange={e => setAddingBus({ ...addingBus, garageId: e.target.value })} disabled={submitting}>
                    <option value="" disabled>Select a garage...</option>
                    {garageItems.map((g: any) => <option key={g.id} value={g.id}>{g?.name ?? "Unknown"}</option>)}
                  </select>
                </FormField>
                <FormField label="Status" required>
                  <select required className="filter-input" value={addingBus?.status || "ACTIVE"} onChange={e => setAddingBus({ ...addingBus, status: e.target.value })} disabled={submitting}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="RETIRED">RETIRED</option>
                  </select>
                </FormField>
                <div className="u-flex u-justify-end u-gap-12 u-mt-24">
                  <Button onClick={() => { setIsBusModalOpen(false); setAddingBus(null); }} variant="secondary" disabled={submitting}>Cancel</Button>
                  <button type="submit" className="shared-button primary" disabled={submitting}>{submitting ? "Saving..." : "Add Bus"}</button>
                </div>
              </form>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <BusImportWizard 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={() => {
            setIsImportModalOpen(false);
            setPage(1);
            fetchBuses();
          }} 
        />
      )}
    </PageContainer>
  );
}
