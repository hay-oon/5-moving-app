"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import SendEstimateModal from "../../../shared/components/modal/SendEstimateModal";
import RejectRequestModal from "../../../shared/components/modal/RejectRequestModal";
import {
  CardListRequest,
  CardListRequestSkeleton,
} from "../../../shared/components/card/CardListRequest";
import {
  Box,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from "@mui/material";
import { CheckboxList } from "../../../shared/components/filter-check-box/CheckboxList";
import { SearchInput } from "../../../shared/components/text-field/Search";
import { MoveSortDropdown } from "./MoveSortDropdown";
import { MoveSortOption } from "./MoveSortDropdown";
import FilterModal from "../../../shared/components/modal/FilterModal";
import EmptyRequest from "./EmptyRequest";
import useModalStates from "@/src/hooks/useModalStates";
import { useReceivedEstimateRequests } from "@/src/hooks/useReceivedEstimateRequests";
import {
  EstimateRequestItem,
  fetchMoverMe,
} from "@/src/api/mover/estimate/requested/api";
import {
  filterEstimateRequests,
  areItemsEqual,
  SIDO_ALIASES,
} from "@/src/utils/filterEstimateRequests";
import { MoverProfile } from "@/src/types/auth";
import { ServiceType } from "@/src/lib/constants";
import { MoveTypeFilterItem, FilterItem } from "@/src/types/filters";
import { useEstimateModalActions } from "@/src/hooks/useEstimateModalActions";
import { useSnackbarStore } from "@/src/store/snackBarStore";
import { useTranslation } from "react-i18next";

type ServiceTypeLabel = (typeof ServiceType)[number];

export default function ReceivedRequestsFlow() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("desktop"));
  const {
    isEstimateModalOpen,
    isRejectModalOpen,
    isFilterModalOpen,
    openEstimateModal,
    closeEstimateModal,
    openRejectModal,
    closeRejectModal,
    openFilterModal,
    closeFilterModal,
  } = useModalStates();
  const { openSnackbar } = useSnackbarStore();
  const { t } = useTranslation();
  const [moveTypeItems, setMoveTypeItems] = useState<MoveTypeFilterItem[]>([
    { label: t("소형이사") as "소형이사", count: 0, checked: false },
    { label: t("가정이사") as "가정이사", count: 0, checked: false },
    { label: t("사무실이사") as "사무실이사", count: 0, checked: false },
  ]);

  const [filterItems, setFilterItems] = useState<FilterItem[]>([
    // 필터 필터링
    {
      label: t("서비스 가능 지역") as "서비스 가능 지역",
      count: 0,
      checked: false,
    },
    {
      label: t("지정 견적 요청") as "지정 견적 요청",
      count: 0,
      checked: false,
    },
  ]);
  const [keyword, setKeyword] = useState(""); // 검색어

  const [selectedTab, setSelectedTab] = useState<"moveType" | "filter">(
    "moveType"
  ); // 필터모달 메뉴

  const [selectedRequest, setSelectedRequest] =
    useState<EstimateRequestItem | null>(null); // 견적 보내기/반려 모달과 연결된 받은 견적 데이터

  const [sortOption, setSortOption] = useState<MoveSortOption>({
    label: t("이사 빠른순"),
    sort: "move_date",
  }); // 정렬

  const [moverProfile, setMoverProfile] = useState<MoverProfile | null>(null); // 기사 정보

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useReceivedEstimateRequests({
      sort: sortOption.sort,
      isTargeted: false,
    });

  const observerRef = useRef<IntersectionObserver | null>(null);
  // 마지막 아이템에 감지용 ref 연결
  const lastItemRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const { sendEstimate, isSending, rejectEstimate, isRejecting } =
    useEstimateModalActions({
      sort: sortOption.sort,
      isTargeted: false,
    });

  // 전체 건수 계산
  const totalCount = useMemo(() => {
    if (!data?.pages?.length) return 0;
    return data.pages[0].totalCount; // 전체 건수
  }, [data?.pages]);

  // 실제 API로 받은 데이터 목록 정리
  const estimateItems = useMemo(() => {
    if (!data?.pages) return [];
    const allItems = data.pages.flatMap((page) => page.items);
    const seen = new Set<string>();
    const uniqueItems = allItems.filter((item) => {
      if (seen.has(item.requestId)) return false;
      seen.add(item.requestId);
      return true;
    });

    return uniqueItems;
  }, [data?.pages]);

  // 필터링된 데이터 적용
  const filteredItems = filterEstimateRequests({
    items: estimateItems,
    moveTypeItems,
    filterItems,
    moverProfile,
    keyword,
  });

  // 기사 프로필 데이터 fetch
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await fetchMoverMe();
        setMoverProfile(profile);
      } catch (e) {
        console.error("프로필 로딩 실패", e);
      }
    };
    fetchProfile();
  }, []);

  // 📎 useEffect 추가: 필터 count를 estimateItems 기준으로 동기화
  useEffect(() => {
    if (!estimateItems.length || !moverProfile) return;

    // 📎 1. 이사 유형별 카운트 계산
    const moveTypeCounts = {
      [t("소형이사")]: 0,
      [t("가정이사")]: 0,
      [t("사무실이사")]: 0,
    } as Record<ServiceTypeLabel, number>;
    // 📎 2. 필터별 카운트 계산
    let targetedCount = 0;
    let regionCount = 0;

    // 서비스 가능 지역이 true인 region들 배열로 추출
    const activeRegions = Object.entries(moverProfile.serviceRegion)
      .filter(([_, isActive]) => isActive)
      .map(([region]) => region);

    estimateItems.forEach((item) => {
      // moveType count
      if (item.moveType === "SMALL")
        moveTypeCounts[t("소형이사") as keyof typeof moveTypeCounts]++;
      if (item.moveType === "HOME")
        moveTypeCounts[t("가정이사") as keyof typeof moveTypeCounts]++;
      if (item.moveType === "OFFICE")
        moveTypeCounts[t("사무실이사") as keyof typeof moveTypeCounts]++;

      // 지정 견적 요청 필터 count
      if (item.isTargeted) targetedCount++;

      // 서비스 가능 지역 필터 count
      const fromSido = item.fromAddressMinimal?.sido;
      const toSido = item.toAddressMinimal?.sido;

      const isRegionMatched = (sido: string): boolean => {
        for (const [region, aliases] of Object.entries(SIDO_ALIASES)) {
          if (aliases.includes(sido)) {
            return activeRegions.includes(region);
          }
        }
        return false;
      };

      const fromMatched = fromSido ? isRegionMatched(fromSido) : false;
      const toMatched = toSido ? isRegionMatched(toSido) : false;

      if (fromMatched || toMatched) regionCount++;
    });

    // 이전 상태와 비교할 새로운 상태 생성
    const newMoveTypeItems = moveTypeItems.map((item) => ({
      ...item,
      count: moveTypeCounts[item.label as ServiceTypeLabel],
    }));

    const newFilterItems = filterItems.map((item) => {
      if (item.label === t("서비스 가능 지역")) {
        return { ...item, count: regionCount };
      }
      if (item.label === t("지정 견적 요청")) {
        return { ...item, count: targetedCount };
      }
      return item;
    });

    // 이전 상태와 다를 때만 setState 호출
    if (!areItemsEqual(moveTypeItems, newMoveTypeItems)) {
      setMoveTypeItems(newMoveTypeItems);
    }
    if (!areItemsEqual(filterItems, newFilterItems)) {
      setFilterItems(newFilterItems);
    }
  }, [estimateItems, moverProfile, moveTypeItems, filterItems]);

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  const handleClear = () => {
    setKeyword("");
  };

  // ✅ 새로 추가: 필터 모달 핸들러
  const handleFilterModalSubmit = (
    moveTypeItems: MoveTypeFilterItem[],
    filterItems: FilterItem[]
  ) => {
    setMoveTypeItems(moveTypeItems);
    setFilterItems(filterItems);
    closeFilterModal();
  };

  // 견적 보내기 모달 핸들러
  const handleSendClick = (request: EstimateRequestItem) => {
    setSelectedRequest(request);
    openEstimateModal();
  };

  // 견적 반려하기 모달 핸들러
  const handleRejectClick = (request: EstimateRequestItem) => {
    setSelectedRequest(request);
    openRejectModal();
  };

  // 견적 보내기 모달 - 콘솔로 데이터 확인(백엔드 연결 후 수정 필요)
  const handleSendEstimate = async (formData: {
    price: number;
    comment: string;
  }) => {
    if (!selectedRequest) return;

    try {
      await sendEstimate({
        requestId: selectedRequest.requestId,
        price: formData.price,
        comment: formData.comment,
      });

      openSnackbar(t("견적을 성공적으로 보냈습니다."), "success");
    } catch (error) {
      openSnackbar(t("견적 보내기에 실패했습니다."), "error");
      console.error(error);
      throw error;
    }
  };

  // 반려하기 모달 - 콘솔로 데이터 확인(백엔드 연결 후 수정 필요)
  const handleSendReject = async (comment: string) => {
    if (!selectedRequest) return;

    try {
      await rejectEstimate({
        requestId: selectedRequest.requestId,
        comment,
      });

      openSnackbar(t("견적 요청 반려를 성공적으로 보냈습니다."), "success");
      closeRejectModal();
    } catch (error) {
      openSnackbar(t("견적 요청 반려 보내기에 실패했습니다."), "error");
      console.error(error);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Typography
          variant={isSmall ? "SB_18" : "SB_24"}
          sx={{
            py: isSmall ? "14px" : "32px",
            width: "100%",
            textAlign: "left",
          }}
        >
          받은 요청
        </Typography>
        <Box sx={{ display: "flex", gap: "107px" }}>
          {/* 좌측 필터 영역 */}
          <Box
            sx={{
              display: isSmall ? "none" : "flex",
              flexDirection: "column",
            }}
          >
            <CheckboxList
              title={t("이사 유형")}
              items={moveTypeItems}
              onItemChange={(index, checked) => {
                // 개별 체크박스 선택
                const newItems = moveTypeItems.map((item, i) =>
                  i === index ? { ...item, checked } : item
                );
                setMoveTypeItems(newItems);
              }}
              // 전체 선택
              onSelectAll={(checked) => {
                const newItems = moveTypeItems.map((item) => ({
                  ...item,
                  checked,
                }));
                setMoveTypeItems(newItems);
              }}
            />
            <CheckboxList
              title={t("필터")}
              items={filterItems}
              onItemChange={(index, checked) => {
                // 개별 체크박스 선택
                const newItems = filterItems.map((item, i) =>
                  i === index ? { ...item, checked } : item
                );
                setFilterItems(newItems);
              }}
              // 전체 선택
              onSelectAll={(checked) => {
                const newItems = filterItems.map((item) => ({
                  ...item,
                  checked,
                }));
                setFilterItems(newItems);
              }}
            />
          </Box>
          {/* 우측 검색, 드롭다운 등 헤더 영역 */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              minWidth: ["375px", "601px", "750px"],
            }}
          >
            <Box sx={{ marginBottom: isSmall ? "12px" : "24px" }}>
              <SearchInput
                variation="left"
                value={keyword}
                onChange={handleKeywordChange}
                onClick={handleClear} // 검색어 삭제 버튼에 적용됨
                placeholder={t("어떤 고객님을 찾고 계세요?")}
                sx={{
                  bgcolor: theme.palette.NeutralGray[200],
                  border: "none",
                }}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: ["16px", "20px", "32px"],
              }}
            >
              <Box sx={{ display: "flex", gap: "4px" }}>
                <Typography variant={isSmall ? "M_13" : "M_16"}>
                  {t("전체")}
                </Typography>
                <Typography variant={isSmall ? "SB_13" : "SB_16"}>
                  {totalCount}
                  {t("건")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: "4px" }}>
                <MoveSortDropdown
                  defaultOption={sortOption}
                  onChange={(option: MoveSortOption) => setSortOption(option)}
                />
                {/* 모바일 환경: 필터 아이콘만 보이기 */}
                {isSmall && (
                  <>
                    <Button
                      onClick={() => openFilterModal()}
                      sx={{
                        padding: 0,
                        width: "32px",
                        height: "32px",
                        minWidth: "32px",
                      }}
                    >
                      <Image
                        src="/Images/icon-btn/sort_button.svg"
                        width={32}
                        height={32}
                        alt="필터"
                        style={{ cursor: "pointer" }}
                      />
                    </Button>
                    <FilterModal
                      open={isFilterModalOpen}
                      onClose={() => closeFilterModal()}
                      moveTypeItems={moveTypeItems}
                      filterItems={filterItems}
                      selectedTab={selectedTab}
                      onTabChange={setSelectedTab}
                      onSubmit={handleFilterModalSubmit}
                    />
                  </>
                )}
              </Box>
            </Box>
            {/* 우측 카드 리스트 또는 EmptyRequest 조건부 렌더링 */}
            <Box
              sx={{
                position: "relative",
                display: isLoading ? "flex" : "block",
                justifyContent: isLoading ? "center" : undefined,
                alignItems: isLoading ? "center" : undefined,
                overflow: "hidden",
              }}
            >
              {isLoading ? (
                <CardListRequestSkeleton />
              ) : filteredItems.length === 0 ? (
                <EmptyRequest />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: ["24px", "32px", "48px"],
                    marginBottom: ["24px", "32px", "48px"],
                  }}
                >
                  {filteredItems.map((item, index) => {
                    const isLast = index === filteredItems.length - 1;
                    return (
                      <div
                        key={item.requestId}
                        ref={isLast ? lastItemRef : undefined} // 마지막 카드에 ref 연결
                      >
                        <CardListRequest
                          data={item}
                          onConfirmClick={() => handleSendClick(item)}
                          onDetailClick={() => handleRejectClick(item)}
                          isRejectDisabled={!item.isTargeted}
                        />
                      </div>
                    );
                  })}
                </Box>
              )}
              {/* fetch 중이면 하단에 CircularProgress */}
              {isFetchingNextPage && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <CircularProgress />
                </Box>
              )}
              {/* 모달들 */}
              {isEstimateModalOpen && selectedRequest && (
                <SendEstimateModal
                  open={isEstimateModalOpen}
                  onClose={() => closeEstimateModal()}
                  onSend={handleSendEstimate}
                  moveType={[selectedRequest.moveType]}
                  isTargeted={selectedRequest.isTargeted ?? false}
                  requestStatus={selectedRequest.requestStatus}
                  customerName={selectedRequest.customerName ?? ""}
                  moveDate={selectedRequest.moveDate}
                  fromAddress={
                    selectedRequest.fromAddressMinimal
                      ? `${selectedRequest.fromAddressMinimal.sido} ${selectedRequest.fromAddressMinimal.sigungu}`
                      : ""
                  }
                  toAddress={
                    selectedRequest.toAddressMinimal
                      ? `${selectedRequest.toAddressMinimal.sido} ${selectedRequest.toAddressMinimal.sigungu}`
                      : ""
                  }
                  isLoading={isSending}
                />
              )}
              {isRejectModalOpen && selectedRequest && (
                <RejectRequestModal
                  open={isRejectModalOpen}
                  onClose={() => closeRejectModal()}
                  onSubmit={handleSendReject}
                  moveType={[selectedRequest.moveType]} // 배열로 감싸기
                  isTargeted={selectedRequest.isTargeted ?? false}
                  requestStatus={selectedRequest.requestStatus}
                  customerName={selectedRequest.customerName ?? ""}
                  moveDate={selectedRequest.moveDate}
                  fromAddress={
                    selectedRequest.fromAddressMinimal
                      ? `${selectedRequest.fromAddressMinimal.sido} ${selectedRequest.fromAddressMinimal.sigungu}`
                      : ""
                  }
                  toAddress={
                    selectedRequest.toAddressMinimal
                      ? `${selectedRequest.toAddressMinimal.sido} ${selectedRequest.toAddressMinimal.sigungu}`
                      : ""
                  }
                  isLoading={isRejecting}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
