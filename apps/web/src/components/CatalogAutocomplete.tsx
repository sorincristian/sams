import React from "react";

interface CatalogAutocompleteProps {
  catalogParts: any[];
  queryLocal: string;
  setQueryLocal: (v: string) => void;
  selectedPartId: string | null;
  setSelectedPartId: (id: string | null) => void;
  placeholder?: string;
  getDisplayValue?: (part: any) => string;
  renderItem?: (part: any, isHighlighted: boolean) => React.ReactNode;
}

export function CatalogAutocomplete({
  catalogParts,
  queryLocal,
  setQueryLocal,
  selectedPartId,
  setSelectedPartId,
  placeholder = "Search part #, description, or type…",
  getDisplayValue = (p) => `${p.partNumber} — ${p.description}`,
  renderItem
}: CatalogAutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const autocompleteRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [queryLocal]);

  const filteredCatalogParts = React.useMemo(() => {
    const q = queryLocal.trim().toLowerCase();

    if (!q) return catalogParts;

    return catalogParts.filter((p) => {
      const partNumber = (p.partNumber || "").toLowerCase();
      const description = (p.description || "").toLowerCase();
      const type = (p.componentType || "").toLowerCase();
      const vendor = (p.vendor || "").toLowerCase();

      return (
        partNumber.includes(q) ||
        description.includes(q) ||
        type.includes(q) ||
        vendor.includes(q)
      );
    });
  }, [catalogParts, queryLocal]);

  return (
    <div ref={autocompleteRef} style={{ position: "relative", flex: "1 1 220px", minWidth: 260 }}>
      <input
        type="text"
        placeholder={placeholder}
        value={queryLocal}
        onChange={(e) => {
          const val = e.target.value;
          setQueryLocal(val);
          setIsOpen(true);
          if (selectedPartId) {
            const selectedPart = catalogParts.find(p => p.id === selectedPartId);
            const expectedLabel = selectedPart ? getDisplayValue(selectedPart) : "";
            if (val !== expectedLabel) {
              setSelectedPartId(null);
            }
          }
        }}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex(prev => Math.min(prev + 1, Math.max(0, filteredCatalogParts.length - 1)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex(prev => Math.max(prev - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (isOpen && filteredCatalogParts[highlightedIndex]) {
              const part = filteredCatalogParts[highlightedIndex];
              setSelectedPartId(part.id);
              setQueryLocal(getDisplayValue(part));
              setIsOpen(false);
            }
          } else if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
        style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
      />

      {isOpen && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6,
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
          maxHeight: 300, overflowY: "auto", zIndex: 100
        }}>
          {filteredCatalogParts.length === 0 ? (
            <div style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.85rem" }}>
              No matching parts found.
            </div>
          ) : (
            filteredCatalogParts.map((part, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <div
                  key={part.id}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => {
                    setSelectedPartId(part.id);
                    setQueryLocal(getDisplayValue(part));
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "8px 14px", cursor: "pointer",
                    background: isHighlighted ? "#f1f5f9" : "#fff",
                    borderBottom: index < filteredCatalogParts.length - 1 ? "1px solid #f1f5f9" : "none",
                    color: "#0f172a"
                  }}
                >
                  {renderItem ? renderItem(part, isHighlighted) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <strong style={{ fontSize: "0.9rem" }}>{part.partNumber}</strong>
                        {part.componentType && (
                          <span style={{ fontSize: "0.7rem", padding: "2px 6px", background: "#e2e8f0", color: "#475569", borderRadius: 4, fontWeight: 600 }}>
                            {part.componentType}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {part.description}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
