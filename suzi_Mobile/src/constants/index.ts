/**
 * 상수 모듈 통합 export
 * 도메인별로 분리된 상수 파일들을 통합하여 기존 import 경로 호환성 유지
 */
export {
	YOUTH_TAX_REDUCTION_CONFIG,
	INELIGIBLE_REASON_LABELS,
	MILITARY_SERVICE_TYPE_LABELS,
	EXCLUDED_INDUSTRY_CODES,
	EXCLUDED_INDUSTRY_LABELS,
} from "./youthTaxConstants";
export { SIX_WAY_SCENARIO_LABELS, DONEE_RELATION_OPTIONS, SURCHARGE_DEADLINE } from "./propertyTaxConstants";
export { TAX_SERVICE_CARDS, HOME_BANNERS } from "./taxServiceConstants";
export { LIFECYCLE_SERVICES, LIFECYCLE_STAGES } from "./lifecycleConstants";
export { DISCLAIMER_TEXTS, REPORT_DISCLAIMERS } from "./disclaimerConstants";
export { MOCK_SAVED_SIMULATIONS } from "./mockDataConstants";
export { CONSULTANT_SPECIALTY_LABELS, MOCK_CONSULTANTS } from "./consultantConstants";
