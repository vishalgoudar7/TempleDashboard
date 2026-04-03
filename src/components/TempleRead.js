import React, { useMemo } from "react";
import { Paper, Typography } from "@mui/material";
import { getStoredTempleOfficerUser } from "../utils/templeOfficerSession";

const cleanText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const TempleRead = ({ data }) => {
  const storedUser = getStoredTempleOfficerUser();
  const source = data && typeof data === "object" ? data : storedUser || {};
  const temple = source?.temple && typeof source.temple === "object" ? source.temple : source;

  const details = useMemo(
    () => [
      { label: "Temple Name", value: source?.templeName || source?.templeAssociated || temple?.name },
      {
        label: "Temple ID",
        value: source?.templeId || source?.temple_id || temple?.temple_id || temple?.id,
      },
      { label: "Taluk", value: temple?.taluk },
      { label: "District", value: temple?.district },
      { label: "City", value: temple?.city },
      { label: "State", value: temple?.state },
      { label: "Pincode", value: temple?.pincode },
      { label: "Address", value: temple?.address },
      { label: "Officer Name", value: source?.username || source?.name },
      { label: "Officer Email", value: source?.email },
    ],
    [source, temple]
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 3,
        border: "1px solid rgba(15, 23, 42, 0.1)",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        backgroundColor: "#fff",
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: "#1f2937" }}>
        About Temple
      </Typography>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {details.map((item) => (
          <div
            key={item.label}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(148, 163, 184, 0.3)",
              background: "#f8fafc",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "#64748b",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                mb: 0.5,
              }}
            >
              {item.label}
            </Typography>
            <Typography variant="body2" sx={{ color: "#1e293b", fontWeight: 600 }}>
              {cleanText(item.value) || "Not available"}
            </Typography>
          </div>
        ))}
      </div>
    </Paper>
  );
};

export default TempleRead;
