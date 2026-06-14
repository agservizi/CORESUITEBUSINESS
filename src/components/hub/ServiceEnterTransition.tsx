"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";
import { consumeServiceLaunch } from "@/lib/service-launch";

export default function ServiceEnterTransition({
  serviceSlug,
  children,
}: {
  serviceSlug: string;
  children: ReactNode;
}) {
  const [fromLaunch, setFromLaunch] = useState(false);

  useEffect(() => {
    setFromLaunch(Boolean(consumeServiceLaunch(serviceSlug)));
  }, [serviceSlug]);

  if (!fromLaunch) {
    return <>{children}</>;
  }

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      sx={{ minHeight: "100%" }}
    >
      {children}
    </Box>
  );
}
