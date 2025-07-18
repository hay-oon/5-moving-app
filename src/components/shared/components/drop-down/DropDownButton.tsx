"use client";
import { Button, Typography, useMediaQuery, useTheme } from "@mui/material";
import Image from "next/image";

interface DropDownButtonProps {
  label: string;
  isSelected: boolean;
  onClick?: () => void;
}

export default function DropDownButton({
  label,
  isSelected,
  onClick,
}: DropDownButtonProps) {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down("tablet"));
  //mui에서 useMediaQuery를 사용하여 반응형 구현했는데, 이렇게 하는게 맞을까요?
  const styles = isTablet
    ? {
        width: "75px",
        height: "36px",
        padding: "6px 10px 6px 14px",
        border: `1px solid ${theme.palette.Line[200]}`,
        borderRadius: "8px",
        backgroundColor: theme.palette.White[100],
        boxShadow: "4px 4px 10px rgba(238, 238, 238, 0.1)",
        typographyVariant: "M_14" as const,
      }
    : isSelected
      ? {
          width: "328px",
          height: "64px",
          padding: "16px 24px",
          border: `1px solid ${theme.palette.PrimaryBlue[300]}`,
          borderRadius: "16px",
          backgroundColor: theme.palette.PrimaryBlue[50],
          boxShadow: "4px 4px 10px rgba(195, 217, 242, 0.2)",
          typographyVariant: "M_18" as const,
        }
      : {
          width: "328px",
          height: "64px",
          padding: "16px 24px",
          border: "1px solid #DEDEDE",
          borderRadius: "16px",
          backgroundColor: theme.palette.White[100],
          boxShadow: "4px 4px 10px rgba(195, 217, 242, 0.2)",
          typographyVariant: "M_18" as const,
        };

  const iconSrc = isSelected
    ? "/Images/drop-down/chevron-down.svg"
    : "/Images/drop-down/chevron-down2.svg";

  return (
    <Button
      onClick={onClick}
      sx={{
        justifyContent: "space-between",
        alignItems: "center",
        textTransform: "none",
        display: "flex",
        width: styles.width,
        height: styles.height,
        padding: styles.padding,
        border: styles.border,
        borderRadius: styles.borderRadius,
        backgroundColor: styles.backgroundColor,
        boxShadow: styles.boxShadow,
      }}
    >
      <Typography variant={styles.typographyVariant}>{label}</Typography>
      <Image src={iconSrc} alt="드롭다운" width={20} height={20} />
    </Button>
  );
}
