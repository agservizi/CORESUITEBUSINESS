"use client";

import { Suspense, useCallback, useState } from "react";
import { Box, Button, IconButton, Alert, LinearProgress } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import { usePlatformNavigation } from "@/context/PlatformNavigationProvider";
import ExpressDashboard from "./express/ExpressDashboard";
import ExpressPosView from "./express/ExpressPosView";
import ExpressSalesView from "./express/ExpressSalesView";
import ExpressStockView from "./express/ExpressStockView";
import ExpressOffersView from "./express/ExpressOffersView";
import ExpressReportsView from "./express/ExpressReportsView";
import ExpressSettingsView from "./express/ExpressSettingsView";
import ExpressProductsView from "./express/ExpressProductsView";
import ExpressRequestsView from "./express/ExpressRequestsView";
import ExpressPortalView from "./express/ExpressPortalView";
import ExpressOfferCompareView from "./express/ExpressOfferCompareView";

interface ExpressModuleViewProps {
  viewId: string;
  serviceColor?: string;
}

export default function ExpressModuleView({ viewId, serviceColor = "#eab308" }: ExpressModuleViewProps) {
  const { navigate } = usePlatformNavigation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [saleDetailId, setSaleDetailId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  function renderView() {
    switch (viewId) {
      case "pos":
        return (
          <Suspense fallback={<LinearProgress sx={{ mb: 2 }} />}>
            <ExpressPosView
              key={refreshKey}
              serviceColor={serviceColor}
              onSaleComplete={() => {
                refresh();
              }}
            />
          </Suspense>
        );
      case "vendite":
      case "entrate":
        return (
          <ExpressSalesView
            key={refreshKey}
            serviceColor={serviceColor}
            initialSaleId={saleDetailId}
            onRefresh={refresh}
          />
        );
      case "magazzino":
      case "operatori":
        return <ExpressStockView key={refreshKey} serviceColor={serviceColor} />;
      case "prodotti":
        return <ExpressProductsView key={refreshKey} serviceColor={serviceColor} />;
      case "richieste":
        return (
          <Suspense fallback={<LinearProgress sx={{ mb: 2 }} />}>
            <ExpressRequestsView key={refreshKey} serviceColor={serviceColor} />
          </Suspense>
        );
      case "portale":
        return <ExpressPortalView key={refreshKey} serviceColor={serviceColor} />;
      case "offerte":
        return <ExpressOffersView key={refreshKey} serviceColor={serviceColor} />;
      case "confronto":
        return <ExpressOfferCompareView key={refreshKey} serviceColor={serviceColor} />;
      case "report":
        return <ExpressReportsView key={refreshKey} serviceColor={serviceColor} />;
      case "impostazioni":
        return <ExpressSettingsView key={refreshKey} serviceColor={serviceColor} />;
      case "dashboard":
      default:
        return (
          <ExpressDashboard
            key={refreshKey}
            serviceColor={serviceColor}
            onOpenSale={(id) => {
              setSaleDetailId(id);
              navigate("vendite");
            }}
            onNavigatePos={() => navigate("pos")}
            onNavigateView={(viewId) => navigate(viewId)}
          />
        );
    }
  }

  const showHeader = viewId !== "dashboard" && viewId !== "pos";

  return (
    <Box>
      {showHeader && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mb: 2, gap: 1 }}>
          <IconButton onClick={refresh} size="small" aria-label="Aggiorna">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("pos")}
            sx={{ background: serviceColor }}
          >
            Nuova vendita
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {renderView()}
    </Box>
  );
}
