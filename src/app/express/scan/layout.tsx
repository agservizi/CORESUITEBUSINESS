import { Box } from "@mui/material";

export default function ExpressScanLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
        overscrollBehavior: "none",
        touchAction: "none",
        "@supports (-webkit-touch-callout: none)": {
          height: "-webkit-fill-available",
          maxHeight: "-webkit-fill-available",
        },
      }}
    >
      {children}
    </Box>
  );
}
