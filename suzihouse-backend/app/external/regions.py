"""
조정대상지역 법정동코드 매핑
국토교통부공고 제2025-1223호 기준
지정기간: 2025.10.16 ~ 지정 해제시까지
"""

REGIONS: dict[str, list[dict[str, str]]] = {
    "서울": [
        {"name": "강남구", "code": "11680"},
        {"name": "서초구", "code": "11650"},
        {"name": "송파구", "code": "11710"},
        {"name": "용산구", "code": "11170"},
        {"name": "성동구", "code": "11200"},
        {"name": "마포구", "code": "11440"},
        {"name": "강동구", "code": "11740"},
        {"name": "영등포구", "code": "11560"},
        {"name": "양천구", "code": "11470"},
        {"name": "동작구", "code": "11590"},
        {"name": "광진구", "code": "11215"},
        {"name": "중구", "code": "11140"},
        {"name": "종로구", "code": "11110"},
        {"name": "서대문구", "code": "11410"},
        {"name": "강서구", "code": "11500"},
        {"name": "노원구", "code": "11350"},
        {"name": "성북구", "code": "11290"},
        {"name": "구로구", "code": "11530"},
        {"name": "동대문구", "code": "11230"},
        {"name": "관악구", "code": "11620"},
        {"name": "은평구", "code": "11380"},
        {"name": "중랑구", "code": "11260"},
        {"name": "금천구", "code": "11545"},
        {"name": "강북구", "code": "11305"},
        {"name": "도봉구", "code": "11320"},
    ],
    "경기": [
        {"name": "수원장안구", "code": "41111"},
        {"name": "수원팔달구", "code": "41113"},
        {"name": "수원영통구", "code": "41117"},
        {"name": "성남수정구", "code": "41131"},
        {"name": "성남중원구", "code": "41133"},
        {"name": "성남분당구", "code": "41135"},
        {"name": "안양동안구", "code": "41173"},
        {"name": "과천시", "code": "41290"},
        {"name": "용인수지구", "code": "41465"},
        {"name": "광명시", "code": "41210"},
        {"name": "하남시", "code": "41450"},
        {"name": "의왕시", "code": "41430"},
    ],
}

# Flat lookup: code → {sido, name}
REGION_BY_CODE: dict[str, dict[str, str]] = {}
for sido, regions in REGIONS.items():
    for r in regions:
        REGION_BY_CODE[r["code"]] = {"sido": sido, "name": r["name"]}

# Flat list of all region entries with sido
ALL_REGIONS: list[dict[str, str]] = []
for sido, regions in REGIONS.items():
    for r in regions:
        ALL_REGIONS.append({"sido": sido, "name": r["name"], "code": r["code"]})
