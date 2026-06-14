"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Button,
  createFilterOptions,
} from "@mui/material";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import QuickClientDialog from "./QuickClientDialog";

export interface ClientOption {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
}

type ClientOptionOrCreate = ClientOption | { id: "__create__"; name: string; inputValue: string };

interface ClientPickerProps {
  value: string;
  onChange: (clientId: string, client?: ClientOption) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  allowQuickCreate?: boolean;
}

const filter = createFilterOptions<ClientOptionOrCreate>();

export default function ClientPicker({
  value,
  onChange,
  label = "Cliente",
  required,
  disabled,
  allowQuickCreate = false,
}: ClientPickerProps) {
  const [options, setOptions] = useState<ClientOption[]>([]);
  const [pinned, setPinned] = useState<ClientOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState({ name: "", email: "" });

  const fetchClients = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/business/clienti?${params}`);
      const data = await res.json();
      setOptions(
        (data.clients || []).map((c: ClientOption) => ({
          id: c.id,
          name: c.name,
          companyName: c.companyName,
          email: c.email,
        }))
      );
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchClients(inputValue), 250);
    return () => clearTimeout(timer);
  }, [inputValue, fetchClients]);

  useEffect(() => {
    if (!value) {
      setPinned(null);
      return;
    }
    if (options.some((o) => o.id === value) || pinned?.id === value) return;

    fetch(`/api/business/clienti/${value}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.id) return;
        const client: ClientOption = {
          id: data.id,
          name: data.name,
          companyName: data.companyName,
          email: data.email,
        };
        setPinned(client);
        setOptions((prev) => (prev.some((o) => o.id === client.id) ? prev : [client, ...prev]));
      })
      .catch(() => undefined);
  }, [value, options, pinned?.id]);

  const selected = useMemo(() => {
    if (!value) return null;
    return options.find((o) => o.id === value) ?? pinned ?? null;
  }, [options, value, pinned]);

  function labelFor(c: ClientOption) {
    return c.companyName ? `${c.companyName} (${c.name})` : c.name;
  }

  function openCreateDialog(defaults?: { name?: string; email?: string }) {
    setCreateDefaults({
      name: defaults?.name?.trim() || inputValue.trim(),
      email: defaults?.email?.trim() || "",
    });
    setCreateOpen(true);
  }

  function handleClientCreated(client: ClientOption) {
    setPinned(client);
    setOptions((prev) => [client, ...prev.filter((o) => o.id !== client.id)]);
    setInputValue(labelFor(client));
    onChange(client.id, client);
  }

  return (
    <>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
        <Autocomplete<ClientOptionOrCreate, false, false, false>
          sx={{ flex: 1 }}
          disabled={disabled}
          options={options}
          loading={loading}
          value={selected}
          inputValue={inputValue}
          onInputChange={(_, v, reason) => {
            if (reason !== "reset") setInputValue(v);
          }}
          onChange={(_, option) => {
            if (!option) {
              onChange("", undefined);
              setPinned(null);
              return;
            }
            if (option.id === "__create__") {
              openCreateDialog({ name: "inputValue" in option ? option.inputValue : option.name });
              return;
            }
            setPinned(option);
            onChange(option.id, option);
            setInputValue(labelFor(option));
          }}
          filterOptions={(opts, params) => {
            if (!allowQuickCreate) return filter(opts, params) as ClientOption[];
            const filtered = filter(opts, params);
            const query = params.inputValue.trim();
            if (!query || loading) return filtered;
            const exists = options.some((o) =>
              labelFor(o).toLowerCase().includes(query.toLowerCase())
            );
            if (exists) return filtered;
            return [
              ...filtered,
              { id: "__create__", name: query, inputValue: query },
            ];
          }}
          getOptionLabel={(o) =>
            o.id === "__create__" ? `Crea cliente "${o.name}"` : labelFor(o)
          }
          isOptionEqualToValue={(a, b) => a.id === b.id}
          noOptionsText={
            loading
              ? "Caricamento…"
              : allowQuickCreate
                ? "Nessun cliente — usa «Nuovo» o crea dalla lista"
                : "Nessun cliente trovato"
          }
          loadingText="Caricamento clienti…"
          renderOption={(props, option) => {
            if (option.id === "__create__") {
              const { key, ...rest } = props;
              return (
                <Box
                  component="li"
                  key={key}
                  {...rest}
                  sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 600 }}
                >
                  <PersonAddOutlinedIcon sx={{ fontSize: 18 }} />
                  Crea cliente &quot;{option.name}&quot;
                </Box>
              );
            }
            const { key, ...rest } = props;
            return (
              <Box component="li" key={key} {...rest}>
                {labelFor(option)}
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              label={label}
              required={required}
              size="small"
              fullWidth={params.fullWidth}
              disabled={params.disabled}
              id={params.id}
              slotProps={{
                inputLabel: params.slotProps.inputLabel,
                input: {
                  ...params.slotProps.input,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color="inherit" size={18} /> : null}
                      {params.slotProps.input.endAdornment}
                    </>
                  ),
                },
                htmlInput: params.slotProps.htmlInput,
              }}
            />
          )}
        />
        {allowQuickCreate && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PersonAddOutlinedIcon />}
            onClick={() => openCreateDialog()}
            disabled={disabled}
            sx={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              height: 40,
              minHeight: 40,
            }}
          >
            Nuovo
          </Button>
        )}
      </Box>

      {allowQuickCreate && (
        <QuickClientDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={handleClientCreated}
          initialName={createDefaults.name}
          initialEmail={createDefaults.email}
        />
      )}
    </>
  );
}
