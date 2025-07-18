"use client";

import { Box, Stack } from "@mui/material";
import { ReactNode, useEffect, useState } from "react";
import { Header } from "./header/Header";
import { DarkModeToggle } from "./ColorModeToggle";
import { usePathname } from "next/navigation";
import { useSnackbar } from "@/src/hooks/snackBarHooks";
import { PATH } from "@/src/lib/constants";
import { SubHeader } from "./header/SubHeader";

type CustomLayoutProps = {
  children: ReactNode;
};

export const CustomLayout = ({ children }: CustomLayoutProps) => {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // locale을 제외한 실제 경로를 얻기
  const pathWithoutLocale = (() => {
    const parts = pathname.split("/");
    if (["ko", "en", "zh"].includes(parts[1])) {
      return "/" + parts.slice(2).join("/");
    }
    return pathname; // locale 없는 경우 그대로 반환
  })();

  // 페이지 중 bgColor 가 들어가는 페이지
  const colorPages = [
    PATH.main,
    PATH.userRequest,
    PATH.userEstimateHistory,
    PATH.userWishlist,
    PATH.moverEstimateConfirm,
    PATH.moverEstimateReject,
  ];
  // padding 적용이 필요 없는 페이지
  const noPaddingPages = [PATH.userEstimateHistory, PATH.moverMypage];
  const subHeaderPages = [
    PATH.userRequest,
    PATH.userEstimate,
    PATH.userEstimateHistory,
    PATH.moverEstimateConfirm,
    PATH.moverEstimateReject,
    PATH.userWishlist,
    PATH.userReviewPending,
    PATH.userReviewCompleted,
  ];

  const isColorPage = colorPages.includes(pathWithoutLocale);
  const isPadding = noPaddingPages.includes(pathWithoutLocale);
  const isSubHeader = subHeaderPages.includes(pathWithoutLocale);

  const { SnackbarComponent } = useSnackbar();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <></>;
  }

  return (
    <Stack
      minHeight={"100vh"}
      width={"100%"}
      sx={(theme) => ({
        bgcolor: isColorPage ? theme.palette.NeutralGray[50] : "transparent",
        alignContent: "center",
        overflowX: "hidden",
      })}
    >
      <Header />
      {isSubHeader && <SubHeader />}
      <Box
        maxWidth={"1400px"}
        mx={"auto"}
        width={"100%"}
        px={isPadding ? 0 : ["26px", "72px", "72px"]}
      >
        {children}
        {SnackbarComponent}
      </Box>
      <DarkModeToggle />
    </Stack>
  );
};
