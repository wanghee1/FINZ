/**
 * Track2 입력 스텝 — 6Way 세금 비교
 *
 * A주택/B주택 정보(주소, 시가, 취득가, 취득일, 조정대상지역, 전세보증금, 대출잔액)
 * + 수증자 관계 입력
 *
 * 실거래가 조회 모달 재활용
 */

import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	Modal,
	FlatList,
	ScrollView,
	ActivityIndicator,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../theme";
import { formatKorean, eokToWon } from "../../utils/formatters";
import { formStyles } from "../../styles/commonStyles";
import PrimaryButton from "../../components/PrimaryButton";
import DatePickerField from "../../components/DatePickerField";
import track2Service from "../../services/track2Service";
import { PropertyInput, DoneeRelation } from "./types";

// ── 수증자 관계 옵션 ──────────────────────────

const DONEE_OPTIONS: { value: DoneeRelation; label: string; desc: string }[] = [
	{ value: "SPOUSE", label: "배우자", desc: "증여세 공제 6억원" },
	{
		value: "LINEAL_DESCENDANT_ADULT",
		label: "직계비속 (성인)",
		desc: "증여세 공제 5,000만원",
	},
	{
		value: "LINEAL_DESCENDANT_MINOR",
		label: "직계비속 (미성년)",
		desc: "증여세 공제 2,000만원",
	},
];

// ── Props ──────────────────────────────────────

interface Track2InputStepProps {
	propertyA: PropertyInput;
	propertyB: PropertyInput;
	doneeRelation: DoneeRelation;
	onPropertyAChange: (patch: Partial<PropertyInput>) => void;
	onPropertyBChange: (patch: Partial<PropertyInput>) => void;
	onDoneeRelationChange: (v: DoneeRelation) => void;
	onCalculate: () => void;
	isInputValid: boolean;
	isLoading: boolean;
	simulationId?: string | null;
}

const Track2InputStep: React.FC<Track2InputStepProps> = ({
	propertyA,
	propertyB,
	doneeRelation,
	onPropertyAChange,
	onPropertyBChange,
	onDoneeRelationChange,
	onCalculate,
	isInputValid,
	isLoading,
	simulationId,
}) => {
	// 입력 서브스텝: 1=A주택, 2=B주택, 3=수증자관계
	const [inputSubStep, setInputSubStep] = useState(1);

	const INPUT_SUB_LABELS = ["A주택", "B주택", "수증자"];

	const canGoNextSub = () => {
		if (inputSubStep === 1) {
			return propertyA.market_price !== "" && propertyA.acquisition_price !== "" && propertyA.acquired_at.length >= 8;
		}
		if (inputSubStep === 2) {
			return propertyB.market_price !== "" && propertyB.acquisition_price !== "" && propertyB.acquired_at.length >= 8;
		}
		return true;
	};
	// 실거래가 조회 상태
	const [realtradeModalVisible, setRealtradeModalVisible] = useState(false);
	const [realtradeTarget, setRealtradeTarget] = useState<"A" | "B">("A");
	const [realtradeLoading, setRealtradeLoading] = useState(false);
	const [realtradeError, setRealtradeError] = useState<string | null>(null);

	// 지역 선택 상태
	const [regions, setRegions] = useState<Record<string, { name: string; code: string }[]>>({});
	const [selectedSido, setSelectedSido] = useState<string>("");
	const [selectedRegion, setSelectedRegion] = useState<{ name: string; code: string } | null>(null);
	const [keyword, setKeyword] = useState("");

	// 검색 결과 상태
	const [apartments, setApartments] = useState<any[]>([]);
	const [searchPeriod, setSearchPeriod] = useState("");
	const [totalTrades, setTotalTrades] = useState(0);
	const [filteredTrades, setFilteredTrades] = useState(0);

	// 아파트 상세 거래 내역 (선택한 아파트)
	const [selectedApt, setSelectedApt] = useState<any | null>(null);

	// 지역 데이터 로드
	useEffect(() => {
		(async () => {
			try {
				const res = await track2Service.getRegions() as any;
				if (res.status === "success" && res.data?.regions) {
					setRegions(res.data.regions);
				}
			} catch {
				// 지역 데이터 로드 실패 시 로컬 fallback
				setRegions({
					서울: [
						{ name: "강남구", code: "11680" }, { name: "서초구", code: "11650" },
						{ name: "송파구", code: "11710" }, { name: "용산구", code: "11170" },
						{ name: "성동구", code: "11200" }, { name: "마포구", code: "11440" },
						{ name: "강동구", code: "11740" }, { name: "영등포구", code: "11560" },
						{ name: "양천구", code: "11470" }, { name: "동작구", code: "11590" },
						{ name: "광진구", code: "11215" }, { name: "중구", code: "11140" },
						{ name: "종로구", code: "11110" }, { name: "서대문구", code: "11410" },
						{ name: "강서구", code: "11500" }, { name: "노원구", code: "11350" },
						{ name: "성북구", code: "11290" }, { name: "구로구", code: "11530" },
						{ name: "동대문구", code: "11230" }, { name: "관악구", code: "11620" },
						{ name: "은평구", code: "11380" }, { name: "중랑구", code: "11260" },
						{ name: "금천구", code: "11545" }, { name: "강북구", code: "11305" },
						{ name: "도봉구", code: "11320" },
					],
					경기: [
						{ name: "수원장안구", code: "41111" }, { name: "수원팔달구", code: "41113" },
						{ name: "수원영통구", code: "41117" }, { name: "성남수정구", code: "41131" },
						{ name: "성남중원구", code: "41133" }, { name: "성남분당구", code: "41135" },
						{ name: "안양동안구", code: "41173" }, { name: "과천시", code: "41290" },
						{ name: "용인수지구", code: "41465" }, { name: "광명시", code: "41210" },
						{ name: "하남시", code: "41450" }, { name: "의왕시", code: "41430" },
					],
				});
			}
		})();
	}, []);

	const handleOpenRealtrade = (target: "A" | "B") => {
		setRealtradeTarget(target);
		setRealtradeModalVisible(true);
		setApartments([]);
		setSelectedApt(null);
		setRealtradeError(null);
		setKeyword("");
	};

	const executeSearch = async () => {
		if (!selectedRegion) {
			setRealtradeError("지역을 선택해주세요.");
			return;
		}
		setRealtradeLoading(true);
		setRealtradeError(null);
		setApartments([]);
		setSelectedApt(null);
		try {
			const res = await track2Service.searchApartments(
				selectedRegion.code,
				keyword.trim(),
			) as any;
			if (res.status === "success" && res.data) {
				const data = res.data as any;
				setApartments(data.apartments ?? []);
				setSearchPeriod(data.period ?? "");
				setTotalTrades(data.total_trades ?? 0);
				setFilteredTrades(data.filtered_trades ?? 0);
				if ((data.apartments ?? []).length === 0) {
					setRealtradeError(
						keyword.trim()
							? `"${keyword.trim()}" 검색 결과가 없습니다.`
							: "해당 지역의 거래 데이터가 없습니다."
					);
				}
			} else {
				setRealtradeError(res.message ?? "조회에 실패했습니다.");
			}
		} catch (err: any) {
			setRealtradeError(err.message ?? "실거래가 조회 중 오류가 발생했습니다.");
		} finally {
			setRealtradeLoading(false);
		}
	};

	const handleSelectTrade = async (item: any) => {
		const priceWon = item.deal_amount ?? 0;
		const priceEok = (priceWon / 100_000_000).toFixed(1);
		const onChange = realtradeTarget === "A" ? onPropertyAChange : onPropertyBChange;

		// 주소도 함께 업데이트
		const address = selectedApt
			? `${selectedSido} ${selectedRegion?.name ?? ""} ${selectedApt.umd_nm ?? ""} ${selectedApt.apt_name}`
			: "";
		onChange({
			market_price: priceEok,
			...(address ? { address: address.trim() } : {}),
		});

		if (simulationId && item.trade_id) {
			try {
				await track2Service.selectRealtrade(simulationId, {
					target: realtradeTarget,
					trade_id: item.trade_id,
					applied_price: priceWon,
				});
			} catch (err) {
				console.warn("[Track2] 실거래가 선택 동기화 실패:", err);
			}
		}
		setRealtradeModalVisible(false);
	};

	return (
		<View style={styles.stepContent}>
			<Text style={styles.stepLabel}>STEP 2</Text>
			<Text style={styles.stepTitle}>주택 정보 입력</Text>
			<Text style={styles.stepSub}>A주택과 B주택의 정보를 입력하면{"\n"}6가지 시나리오별 세금을 비교합니다</Text>

			{/* 서브스텝 인디케이터 */}
			<View style={styles.subStepRow}>
				{INPUT_SUB_LABELS.map((label, i) => (
					<TouchableOpacity
						key={i}
						style={[styles.subStepChip, inputSubStep === i + 1 && styles.subStepChipActive]}
						onPress={() => {
							if (i + 1 < inputSubStep) setInputSubStep(i + 1);
						}}
						disabled={i + 1 > inputSubStep}
					>
						<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
							{i + 1 < inputSubStep && (
								<Ionicons name="checkmark" size={14} color={inputSubStep === i + 1 ? COLORS.white : COLORS.blue600} />
							)}
							<Text style={[styles.subStepChipText, inputSubStep === i + 1 && styles.subStepChipTextActive]}>
								{label}
							</Text>
						</View>
					</TouchableOpacity>
				))}
			</View>

			{/* 서브스텝 1: A주택 */}
			{inputSubStep === 1 && (
				<>
					<PropertySection
						label="A"
						color={COLORS.blue600}
						property={propertyA}
						onChange={onPropertyAChange}
						onSearchRealtrade={() => handleOpenRealtrade("A")}
					/>
					<PrimaryButton
						text="다음: B주택 입력"
						onPress={() => setInputSubStep(2)}
						disabled={!canGoNextSub()}
						iconLeft="arrow-forward-outline"
						color={COLORS.blue600}
					/>
				</>
			)}

			{/* 서브스텝 2: B주택 */}
			{inputSubStep === 2 && (
				<>
					<PropertySection
						label="B"
						color={COLORS.teal600}
						property={propertyB}
						onChange={onPropertyBChange}
						onSearchRealtrade={() => handleOpenRealtrade("B")}
					/>
					<View style={styles.subStepNavRow}>
						<TouchableOpacity style={styles.subStepBackBtn} onPress={() => setInputSubStep(1)}>
							<Ionicons name="arrow-back" size={18} color={COLORS.gray500} />
							<Text style={styles.subStepBackText}>A주택 수정</Text>
						</TouchableOpacity>
					</View>
					<PrimaryButton
						text="다음: 수증자 관계"
						onPress={() => setInputSubStep(3)}
						disabled={!canGoNextSub()}
						iconLeft="arrow-forward-outline"
						color={COLORS.blue600}
					/>
				</>
			)}

			{/* 서브스텝 3: 수증자 관계 + 최종 계산 */}
			{inputSubStep === 3 && (
				<>
					<View style={styles.doneeSection}>
						<Text style={styles.doneeSectionTitle}>수증자 관계</Text>
						<Text style={styles.doneeSectionDesc}>증여·부담부증여 시 해당 시나리오에 적용됩니다.</Text>
						{DONEE_OPTIONS.map((opt) => (
							<TouchableOpacity
								key={opt.value}
								style={[styles.doneeOption, doneeRelation === opt.value && styles.doneeOptionActive]}
								onPress={() => onDoneeRelationChange(opt.value)}
							>
								<View style={{ flex: 1 }}>
									<Text style={[styles.doneeLabel, doneeRelation === opt.value && styles.doneeLabelActive]}>
										{opt.label}
									</Text>
									<Text style={styles.doneeDesc}>{opt.desc}</Text>
								</View>
								{doneeRelation === opt.value && (
									<Ionicons name="checkmark-circle" size={22} color={COLORS.blue600} />
								)}
							</TouchableOpacity>
						))}
					</View>

					{/* 입력 요약 */}
					<View style={styles.inputSummary}>
						<Text style={styles.inputSummaryTitle}>입력 요약</Text>
						<View style={styles.inputSummaryRow}>
							<Text style={styles.inputSummaryLabel}>A주택 시가</Text>
							<Text style={styles.inputSummaryValue}>{propertyA.market_price ? `${propertyA.market_price}억원` : "-"}</Text>
						</View>
						<View style={styles.inputSummaryRow}>
							<Text style={styles.inputSummaryLabel}>B주택 시가</Text>
							<Text style={styles.inputSummaryValue}>{propertyB.market_price ? `${propertyB.market_price}억원` : "-"}</Text>
						</View>
						<View style={styles.inputSummaryRow}>
							<Text style={styles.inputSummaryLabel}>수증자</Text>
							<Text style={styles.inputSummaryValue}>
								{DONEE_OPTIONS.find((o) => o.value === doneeRelation)?.label ?? "-"}
							</Text>
						</View>
					</View>

					<View style={styles.subStepNavRow}>
						<TouchableOpacity style={styles.subStepBackBtn} onPress={() => setInputSubStep(2)}>
							<Ionicons name="arrow-back" size={18} color={COLORS.gray500} />
							<Text style={styles.subStepBackText}>B주택 수정</Text>
						</TouchableOpacity>
					</View>

					<PrimaryButton
						text={isLoading ? "계산 중..." : "세금 비교 계산하기"}
						onPress={onCalculate}
						disabled={!isInputValid || isLoading}
						color={COLORS.blue600}
					/>
				</>
			)}

			{/* 실거래가 조회 모달 */}
			<RealtradeModal
				visible={realtradeModalVisible}
				onClose={() => setRealtradeModalVisible(false)}
				target={realtradeTarget}
				regions={regions}
				selectedSido={selectedSido}
				setSelectedSido={setSelectedSido}
				selectedRegion={selectedRegion}
				setSelectedRegion={setSelectedRegion}
				keyword={keyword}
				setKeyword={setKeyword}
				onSearch={executeSearch}
				apartments={apartments}
				selectedApt={selectedApt}
				setSelectedApt={setSelectedApt}
				searchPeriod={searchPeriod}
				totalTrades={totalTrades}
				filteredTrades={filteredTrades}
				loading={realtradeLoading}
				error={realtradeError}
				onSelectTrade={handleSelectTrade}
			/>
		</View>
	);
};

// ── 주택 정보 섹션 ─────────────────────────────

interface PropertySectionProps {
	label: string;
	color: string;
	property: PropertyInput;
	onChange: (patch: Partial<PropertyInput>) => void;
	onSearchRealtrade: () => void;
}

const PropertySection: React.FC<PropertySectionProps> = ({ label, color, property, onChange, onSearchRealtrade }) => (
	<View style={styles.propertySection}>
		<View style={styles.propertySectionHeader}>
			<View style={[styles.propertyBadge, { backgroundColor: color + "15" }]}>
				<Text style={[styles.propertyBadgeText, { color }]}>{label}</Text>
			</View>
			<Text style={styles.propertySectionTitle}>{label}주택 정보</Text>
		</View>

		{/* 주소 */}
		<View style={formStyles.group}>
			<Text style={formStyles.label}>주소</Text>
			<TextInput
				style={formStyles.input}
				placeholder="예: 서울시 송파구 잠실동"
				placeholderTextColor={COLORS.gray400}
				value={property.address}
				onChangeText={(v) => onChange({ address: v })}
			/>
		</View>

		{/* 시가 */}
		<View style={formStyles.group}>
			<View style={styles.priceLabelRow}>
				<Text style={formStyles.label}>시가 (억원)</Text>
				<TouchableOpacity style={styles.realtradeBtn} onPress={onSearchRealtrade}>
					<Ionicons name="search-outline" size={14} color={COLORS.blue600} />
					<Text style={styles.realtradeBtnText}>실거래가 조회</Text>
				</TouchableOpacity>
			</View>
			<TextInput
				style={formStyles.input}
				placeholder="예: 28"
				placeholderTextColor={COLORS.gray400}
				value={property.market_price}
				onChangeText={(v) => onChange({ market_price: v })}
				keyboardType="decimal-pad"
			/>
			{property.market_price !== "" && eokToWon(property.market_price) > 0 && (
				<Text style={formStyles.hint}>= {formatKorean(eokToWon(property.market_price))}</Text>
			)}
		</View>

		{/* 취득가액 */}
		<View style={formStyles.group}>
			<Text style={formStyles.label}>취득가액 (억원)</Text>
			<TextInput
				style={formStyles.input}
				placeholder="예: 15"
				placeholderTextColor={COLORS.gray400}
				value={property.acquisition_price}
				onChangeText={(v) => onChange({ acquisition_price: v })}
				keyboardType="decimal-pad"
			/>
			{property.acquisition_price !== "" && eokToWon(property.acquisition_price) > 0 && (
				<Text style={formStyles.hint}>= {formatKorean(eokToWon(property.acquisition_price))}</Text>
			)}
		</View>

		{/* 취득일 */}
		<View style={formStyles.group}>
			<Text style={formStyles.label}>취득일</Text>
			<DatePickerField
				value={property.acquired_at}
				onChange={(v) => onChange({ acquired_at: v })}
				placeholder="YYYY-MM-DD"
			/>
		</View>

		{/* 조정대상지역 토글 */}
		<View style={styles.regulatedSection}>
			<View style={styles.toggleRow}>
				<View style={{ flex: 1 }}>
					<Text style={formStyles.label}>조정대상지역</Text>
					<Text style={styles.regulatedHint}>
						{property.is_regulated ? "취득세 12.4% 적용 (증여 시)" : "취득세 3.8% 적용 (증여 시)"}
					</Text>
				</View>
				<TouchableOpacity
					style={[styles.toggleBtn, property.is_regulated && styles.toggleBtnActive]}
					onPress={() => onChange({ is_regulated: !property.is_regulated })}
				>
					<Text style={[styles.toggleText, property.is_regulated && styles.toggleTextActive]}>
						{property.is_regulated ? "예" : "아니오"}
					</Text>
				</TouchableOpacity>
			</View>
			{!property.is_regulated && (
				<View style={styles.regulatedWarning}>
					<Ionicons name="alert-circle-outline" size={14} color={COLORS.orange600} />
					<Text style={styles.regulatedWarningText}>
						서울·과천·세종 등 대부분의 수도권은 조정대상지역입니다
					</Text>
				</View>
			)}
		</View>

		{/* 전세보증금 */}
		<View style={formStyles.group}>
			<Text style={formStyles.label}>전세보증금 (억원)</Text>
			<TextInput
				style={formStyles.input}
				placeholder="0"
				placeholderTextColor={COLORS.gray400}
				value={property.lease_deposit}
				onChangeText={(v) => onChange({ lease_deposit: v })}
				keyboardType="decimal-pad"
			/>
			<Text style={formStyles.hint}>부담부증여 시 수증자가 인수하는 채무</Text>
		</View>

		{/* 대출잔액 */}
		<View style={formStyles.group}>
			<Text style={formStyles.label}>대출잔액 (억원)</Text>
			<TextInput
				style={formStyles.input}
				placeholder="0"
				placeholderTextColor={COLORS.gray400}
				value={property.loan_balance}
				onChangeText={(v) => onChange({ loan_balance: v })}
				keyboardType="decimal-pad"
			/>
			<Text style={formStyles.hint}>부담부증여 시 수증자가 인수하는 채무</Text>
		</View>
	</View>
);

// ── 실거래가 조회 모달 ────────────────────────

interface RealtradeModalProps {
	visible: boolean;
	onClose: () => void;
	target: "A" | "B";
	regions: Record<string, { name: string; code: string }[]>;
	selectedSido: string;
	setSelectedSido: (v: string) => void;
	selectedRegion: { name: string; code: string } | null;
	setSelectedRegion: (v: { name: string; code: string } | null) => void;
	keyword: string;
	setKeyword: (v: string) => void;
	onSearch: () => void;
	apartments: any[];
	selectedApt: any | null;
	setSelectedApt: (v: any | null) => void;
	searchPeriod: string;
	totalTrades: number;
	filteredTrades: number;
	loading: boolean;
	error: string | null;
	onSelectTrade: (item: any) => void;
}

const RealtradeModal: React.FC<RealtradeModalProps> = ({
	visible,
	onClose,
	target,
	regions,
	selectedSido,
	setSelectedSido,
	selectedRegion,
	setSelectedRegion,
	keyword,
	setKeyword,
	onSearch,
	apartments,
	selectedApt,
	setSelectedApt,
	searchPeriod,
	totalTrades,
	filteredTrades,
	loading,
	error,
	onSelectTrade,
}) => {
	const sidoList = Object.keys(regions);
	const guList = selectedSido ? (regions[selectedSido] ?? []) : [];

	// 뒤로가기: 아파트 상세 → 아파트 목록
	const handleBack = () => {
		if (selectedApt) {
			setSelectedApt(null);
		} else {
			onClose();
		}
	};

	return (
		<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
			<View style={modalStyles.container}>
				{/* 헤더 */}
				<View style={modalStyles.header}>
					<TouchableOpacity onPress={handleBack} style={modalStyles.headerBackBtn}>
						<Ionicons
							name={selectedApt ? "arrow-back" : "close"}
							size={24}
							color={COLORS.gray700}
						/>
					</TouchableOpacity>
					<Text style={modalStyles.headerTitle}>
						{selectedApt
							? selectedApt.apt_name
							: `실거래가 조회 (${target}주택)`}
					</Text>
					<View style={{ width: 24 }} />
				</View>

				{/* 아파트 상세 거래 목록 뷰 */}
				{selectedApt ? (
					<View style={{ flex: 1 }}>
						{/* 아파트 요약 정보 */}
						<View style={modalStyles.aptSummaryBar}>
							<Text style={modalStyles.aptSummaryName}>{selectedApt.apt_name}</Text>
							<Text style={modalStyles.aptSummaryDetail}>
								{selectedApt.umd_nm ? `${selectedApt.umd_nm} · ` : ""}
								{selectedApt.build_year ? `${selectedApt.build_year}년` : ""}
								{selectedApt.road_nm ? ` · ${selectedApt.road_nm}` : ""}
							</Text>
							<Text style={modalStyles.aptSummaryCount}>
								최근 6개월 거래 {selectedApt.trades?.length ?? 0}건
							</Text>
						</View>

						<Text style={modalStyles.tradeSelectHint}>
							적용할 거래를 선택하세요
						</Text>

						{/* 거래 목록 */}
						<FlatList
							data={selectedApt.trades ?? []}
							keyExtractor={(item: any, idx: number) => item.trade_id ?? String(idx)}
							contentContainerStyle={modalStyles.listContent}
							renderItem={({ item }: { item: any }) => (
								<TouchableOpacity
									style={modalStyles.tradeItem}
									onPress={() => onSelectTrade(item)}
								>
									<View style={{ flex: 1 }}>
										<View style={modalStyles.tradeTopRow}>
											<Text style={modalStyles.tradePrice}>
												{item.deal_amount_display || formatKorean(item.deal_amount ?? 0)}
											</Text>
											{item.is_canceled && (
												<View style={modalStyles.cancelBadge}>
													<Text style={modalStyles.cancelBadgeText}>해제</Text>
												</View>
											)}
										</View>
										<Text style={modalStyles.tradeDetail}>
											{item.area}㎡ ({item.area_pyeong}평) · {item.floor}층
											{item.apt_dong ? ` · ${item.apt_dong}동` : ""}
										</Text>
										<Text style={modalStyles.tradeDate}>
											{item.deal_date}{item.dealing_type ? ` · ${item.dealing_type}` : ""}
										</Text>
									</View>
									<View style={modalStyles.selectBtnBox}>
										<Ionicons name="checkmark-circle-outline" size={22} color={COLORS.blue600} />
										<Text style={modalStyles.selectBtnText}>선택</Text>
									</View>
								</TouchableOpacity>
							)}
						/>
					</View>
				) : (
					/* 검색 뷰 */
					<View style={{ flex: 1 }}>
						<ScrollView
							style={{ flex: 1 }}
							keyboardShouldPersistTaps="handled"
							contentContainerStyle={{ flexGrow: 1 }}
						>
							{/* 지역 선택 */}
							<View style={modalStyles.searchSection}>
								<Text style={modalStyles.sectionLabel}>1. 지역 선택</Text>

								{/* 시/도 선택 */}
								<View style={modalStyles.chipRow}>
									{sidoList.map((sido) => (
										<TouchableOpacity
											key={sido}
											style={[
												modalStyles.chip,
												selectedSido === sido && modalStyles.chipActive,
											]}
											onPress={() => {
												setSelectedSido(sido);
												setSelectedRegion(null);
											}}
										>
											<Text
												style={[
													modalStyles.chipText,
													selectedSido === sido && modalStyles.chipTextActive,
												]}
											>
												{sido}
											</Text>
										</TouchableOpacity>
									))}
								</View>

								{/* 구/시 선택 */}
								{selectedSido && (
									<View style={modalStyles.guGrid}>
										{guList.map((gu) => (
											<TouchableOpacity
												key={gu.code}
												style={[
													modalStyles.guChip,
													selectedRegion?.code === gu.code && modalStyles.guChipActive,
												]}
												onPress={() => setSelectedRegion(gu)}
											>
												<Text
													style={[
														modalStyles.guChipText,
														selectedRegion?.code === gu.code && modalStyles.guChipTextActive,
													]}
												>
													{gu.name}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								)}

								{/* 키워드 검색 */}
								<Text style={[modalStyles.sectionLabel, { marginTop: SPACING.lg }]}>
									2. 아파트 검색 (선택)
								</Text>
								<TextInput
									style={formStyles.input}
									placeholder="아파트명 또는 주소 입력 (전체조회: 빈칸)"
									placeholderTextColor={COLORS.gray400}
									value={keyword}
									onChangeText={setKeyword}
									returnKeyType="search"
									onSubmitEditing={onSearch}
								/>

								<PrimaryButton
									text={loading ? "조회 중..." : "실거래가 조회"}
									onPress={onSearch}
									disabled={loading || !selectedRegion}
									iconLeft="search-outline"
									color={COLORS.blue600}
								/>
							</View>

							{/* 로딩 */}
							{loading && (
								<View style={modalStyles.centerBox}>
									<ActivityIndicator size="large" color={COLORS.blue600} />
									<Text style={modalStyles.loadingText}>
										최근 6개월 실거래가 조회 중...
									</Text>
									<Text style={modalStyles.loadingSubText}>
										데이터가 많을 경우 시간이 걸릴 수 있습니다
									</Text>
								</View>
							)}

							{/* 에러 */}
							{error && !loading && (
								<View style={modalStyles.centerBox}>
									<Ionicons name="alert-circle-outline" size={32} color={COLORS.red500} />
									<Text style={modalStyles.errorText}>{error}</Text>
								</View>
							)}

							{/* 검색 결과 요약 */}
							{!loading && apartments.length > 0 && (
								<View style={modalStyles.resultSummary}>
									<Text style={modalStyles.resultSummaryText}>
										{searchPeriod} · 전체 {totalTrades}건 중{" "}
										{keyword ? `"${keyword}" ` : ""}
										{filteredTrades}건 · 아파트 {apartments.length}개 단지
									</Text>
								</View>
							)}

							{/* 아파트 목록 */}
							{!loading && apartments.length > 0 && (
								<View style={modalStyles.listContent}>
									{apartments.map((apt: any, idx: number) => (
										<TouchableOpacity
											key={`${apt.apt_name}_${idx}`}
											style={modalStyles.aptCard}
											onPress={() => setSelectedApt(apt)}
										>
											<View style={{ flex: 1 }}>
												<Text style={modalStyles.aptName}>{apt.apt_name}</Text>
												<Text style={modalStyles.aptDetail}>
													{apt.umd_nm ? `${apt.umd_nm}` : ""}
													{apt.build_year ? ` · ${apt.build_year}년` : ""}
													{apt.road_nm ? ` · ${apt.road_nm}` : ""}
												</Text>
												<Text style={modalStyles.aptAreas}>
													{(apt.areas ?? []).slice(0, 3).join(", ")}
													{(apt.areas ?? []).length > 3 ? ` 외 ${apt.areas.length - 3}` : ""}
												</Text>
												<View style={modalStyles.aptPriceRow}>
													<Text style={modalStyles.aptPriceRange}>
														{apt.min_price_display} ~ {apt.max_price_display}
													</Text>
													<Text style={modalStyles.aptTradeCount}>
														{apt.trade_count}건
													</Text>
												</View>
											</View>
											<Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
										</TouchableOpacity>
									))}
								</View>
							)}
						</ScrollView>
					</View>
				)}
			</View>
		</Modal>
	);
};

// ── 모달 스타일 ──────────────────────────────

const modalStyles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.white },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.lg,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.gray200,
	},
	headerBackBtn: { padding: 4 },
	headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.gray900, flex: 1, textAlign: "center" },
	searchSection: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
	sectionLabel: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.gray700,
		marginBottom: SPACING.sm,
	},
	// 시/도 칩
	chipRow: {
		flexDirection: "row",
		gap: SPACING.sm,
		marginBottom: SPACING.md,
	},
	chip: {
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.sm + 2,
		borderRadius: RADIUS.full,
		backgroundColor: COLORS.gray100,
		borderWidth: 1.5,
		borderColor: COLORS.gray200,
	},
	chipActive: {
		backgroundColor: COLORS.blue600,
		borderColor: COLORS.blue600,
	},
	chipText: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.gray600,
	},
	chipTextActive: {
		color: COLORS.white,
	},
	// 구/시 그리드
	guGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: SPACING.xs,
		marginBottom: SPACING.md,
	},
	guChip: {
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		borderRadius: RADIUS.md,
		backgroundColor: COLORS.gray50,
		borderWidth: 1,
		borderColor: COLORS.gray200,
	},
	guChipActive: {
		backgroundColor: COLORS.blue50,
		borderColor: COLORS.blue600,
	},
	guChipText: {
		fontSize: 13,
		color: COLORS.gray600,
	},
	guChipTextActive: {
		color: COLORS.blue600,
		fontWeight: "700",
	},
	centerBox: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: SPACING.xxxl,
		gap: SPACING.md,
	},
	loadingText: { fontSize: 14, color: COLORS.gray500 },
	loadingSubText: { fontSize: 12, color: COLORS.gray400 },
	errorText: { fontSize: 14, color: COLORS.red500, textAlign: "center" },
	// 검색 결과 요약
	resultSummary: {
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.md,
		backgroundColor: COLORS.blue50,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.blue100,
	},
	resultSummaryText: { fontSize: 13, color: COLORS.blue600, fontWeight: "600" },
	// 아파트 카드 리스트
	listContent: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl },
	aptCard: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: SPACING.lg,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.gray100,
	},
	aptName: { fontSize: 16, fontWeight: "700", color: COLORS.gray800, marginBottom: 3 },
	aptDetail: { fontSize: 12, color: COLORS.gray500, marginBottom: 2 },
	aptAreas: { fontSize: 12, color: COLORS.gray400, marginBottom: 4 },
	aptPriceRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.md,
	},
	aptPriceRange: { fontSize: 14, fontWeight: "700", color: COLORS.blue600 },
	aptTradeCount: { fontSize: 12, color: COLORS.gray500 },
	// 아파트 상세 뷰
	aptSummaryBar: {
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.lg,
		backgroundColor: COLORS.gray50,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.gray200,
	},
	aptSummaryName: { fontSize: 17, fontWeight: "700", color: COLORS.gray900, marginBottom: 4 },
	aptSummaryDetail: { fontSize: 13, color: COLORS.gray500, marginBottom: 2 },
	aptSummaryCount: { fontSize: 13, color: COLORS.blue600, fontWeight: "600" },
	tradeSelectHint: {
		fontSize: 13,
		color: COLORS.gray500,
		textAlign: "center",
		paddingVertical: SPACING.md,
		backgroundColor: COLORS.blue50,
	},
	// 거래 아이템
	tradeItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: SPACING.lg,
		paddingHorizontal: SPACING.xl,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.gray100,
	},
	tradeTopRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginBottom: 3,
	},
	tradePrice: { fontSize: 16, fontWeight: "700", color: COLORS.blue600 },
	cancelBadge: {
		backgroundColor: COLORS.red500,
		paddingHorizontal: SPACING.sm,
		paddingVertical: 2,
		borderRadius: 4,
	},
	cancelBadgeText: { fontSize: 10, fontWeight: "700", color: COLORS.white },
	tradeDetail: { fontSize: 13, color: COLORS.gray600, marginBottom: 2 },
	tradeDate: { fontSize: 12, color: COLORS.gray400 },
	selectBtnBox: {
		alignItems: "center",
		marginLeft: SPACING.md,
		gap: 2,
	},
	selectBtnText: { fontSize: 11, color: COLORS.blue600, fontWeight: "600" },
});

// ── 스타일 ──────────────────────────────────

const styles = StyleSheet.create({
	stepContent: {
		paddingHorizontal: SPACING.xl,
		paddingTop: SPACING.xxl,
	},
	stepLabel: {
		fontSize: 12,
		fontWeight: "700",
		color: COLORS.blue600,
		marginBottom: SPACING.xs,
	},
	stepTitle: {
		fontSize: 22,
		fontWeight: "700",
		color: COLORS.gray900,
		marginBottom: SPACING.sm,
	},
	stepSub: {
		fontSize: 14,
		color: COLORS.gray500,
		marginBottom: SPACING.xxl,
		lineHeight: 21,
	},
	// 주택 섹션
	propertySection: {
		borderWidth: 1,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.xl,
	},
	propertySectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.md,
		marginBottom: SPACING.lg,
	},
	propertyBadge: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: "center",
		alignItems: "center",
	},
	propertyBadgeText: {
		fontSize: 16,
		fontWeight: "700",
	},
	propertySectionTitle: {
		fontSize: 17,
		fontWeight: "700",
		color: COLORS.gray800,
	},
	priceLabelRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: SPACING.xs,
	},
	realtradeBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderRadius: RADIUS.sm,
		backgroundColor: COLORS.blue50,
	},
	realtradeBtnText: {
		fontSize: 12,
		fontWeight: "600",
		color: COLORS.blue600,
	},
	regulatedSection: {
		marginBottom: SPACING.lg,
	},
	regulatedHint: {
		fontSize: 12,
		color: COLORS.blue600,
		fontWeight: "600",
		marginTop: 2,
	},
	regulatedWarning: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		backgroundColor: COLORS.orange50,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		borderRadius: RADIUS.sm,
		marginTop: SPACING.xs,
	},
	regulatedWarningText: {
		fontSize: 11,
		color: COLORS.orange600,
		flex: 1,
	},
	toggleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	toggleBtn: {
		paddingHorizontal: SPACING.xl,
		paddingVertical: SPACING.sm + 2,
		borderRadius: RADIUS.full,
		backgroundColor: COLORS.gray100,
	},
	toggleBtnActive: {
		backgroundColor: COLORS.blue600,
	},
	toggleText: {
		fontSize: 14,
		fontWeight: "600",
		color: COLORS.gray500,
	},
	toggleTextActive: {
		color: COLORS.white,
	},
	// 수증자 관계
	doneeSection: {
		borderWidth: 1,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.lg,
		padding: SPACING.lg,
		marginBottom: SPACING.xl,
	},
	doneeSectionTitle: {
		fontSize: 17,
		fontWeight: "700",
		color: COLORS.gray800,
		marginBottom: SPACING.xs,
	},
	doneeSectionDesc: {
		fontSize: 13,
		color: COLORS.gray500,
		marginBottom: SPACING.lg,
	},
	doneeOption: {
		flexDirection: "row",
		alignItems: "center",
		padding: SPACING.lg,
		borderWidth: 1.5,
		borderColor: COLORS.gray200,
		borderRadius: RADIUS.md,
		marginBottom: SPACING.sm,
	},
	doneeOptionActive: {
		borderColor: COLORS.blue600,
		backgroundColor: COLORS.blue50,
	},
	doneeLabel: {
		fontSize: 15,
		fontWeight: "700",
		color: COLORS.gray800,
		marginBottom: 2,
	},
	doneeLabelActive: {
		color: COLORS.blue600,
	},
	doneeDesc: {
		fontSize: 12,
		color: COLORS.gray500,
	},
	// 서브스텝 인디케이터
	subStepRow: {
		flexDirection: "row",
		gap: SPACING.sm,
		marginBottom: SPACING.xl,
	},
	subStepChip: {
		flex: 1,
		paddingVertical: SPACING.sm + 2,
		borderRadius: RADIUS.full,
		backgroundColor: COLORS.gray100,
		alignItems: "center",
		borderWidth: 1.5,
		borderColor: COLORS.gray200,
	},
	subStepChipActive: {
		backgroundColor: COLORS.blue600,
		borderColor: COLORS.blue600,
	},
	subStepChipText: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.gray400,
	},
	subStepChipTextActive: {
		color: COLORS.white,
	},
	subStepNavRow: {
		flexDirection: "row",
		marginBottom: SPACING.md,
	},
	subStepBackBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.xs,
		paddingVertical: SPACING.sm,
	},
	subStepBackText: {
		fontSize: 13,
		color: COLORS.gray500,
		fontWeight: "600",
	},
	// 입력 요약
	inputSummary: {
		backgroundColor: COLORS.gray50,
		borderRadius: RADIUS.md,
		padding: SPACING.lg,
		marginBottom: SPACING.lg,
		gap: SPACING.sm,
	},
	inputSummaryTitle: {
		fontSize: 14,
		fontWeight: "700",
		color: COLORS.gray700,
		marginBottom: SPACING.xs,
	},
	inputSummaryRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	inputSummaryLabel: {
		fontSize: 13,
		color: COLORS.gray500,
	},
	inputSummaryValue: {
		fontSize: 13,
		fontWeight: "600",
		color: COLORS.gray800,
	},
});

export default Track2InputStep;
