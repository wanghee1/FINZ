"""
End-to-end integration test against running server.

Tests the full user flow:
  1. Health check
  2. Signup
  3. Login → get JWT
  4. Get profile
  5. Update profile
  6. Track 1: Auth start/confirm, get result
  7. Track 2: Create simulation, update inputs, calculate, get result
  8. Track 2: AI summary
  9. Track 2: Delete simulation
  10. Logout
"""

import httpx
import asyncio
import sys
import io

# Fix Windows console encoding for Korean/Unicode output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

BASE = "http://127.0.0.1:8000"
TOKEN = None
REFRESH_TOKEN = None
SIMULATION_ID = None

results = []


def record(name: str, ok: bool, detail: str = ""):
    status = "PASS" if ok else "FAIL"
    results.append((name, status, detail))
    mark = "✓" if ok else "✗"
    print(f"  {mark} {name}" + (f"  ({detail})" if detail else ""))


async def run_tests():
    global TOKEN, REFRESH_TOKEN, SIMULATION_ID

    async with httpx.AsyncClient(base_url=BASE, timeout=15.0) as c:

        # ── 1. Health Check ──
        r = await c.get("/health")
        record("GET /health", r.status_code == 200, f"{r.status_code}")

        # ── 2. Signup ──
        r = await c.post("/auth/signup", json={
            "email": "test@suzihouse.com",
            "password": "Test1234!",
            "name": "홍길동",
            "birth_date": "1997-03-15",
            "gender": "M",
        })
        ok = r.status_code in (200, 201)
        record("POST /auth/signup", ok, f"{r.status_code} {r.json().get('status', '')}")

        # ── 3. Login ──
        r = await c.post("/auth/login", json={
            "email": "test@suzihouse.com",
            "password": "Test1234!",
        })
        ok = r.status_code == 200
        data = r.json()
        TOKEN = data.get("data", {}).get("access_token", "")
        REFRESH_TOKEN = data.get("data", {}).get("refresh_token", "")
        record("POST /auth/login", ok and bool(TOKEN), f"token={'yes' if TOKEN else 'no'}")

        if not TOKEN:
            # If login failed, skip all authenticated tests
            print("  [SKIP] All authenticated tests skipped (no token)")
            print("\n" + "=" * 60)
            passed = sum(1 for _, s, _ in results if s == "PASS")
            failed = sum(1 for _, s, _ in results if s == "FAIL")
            total = len(results)
            print(f"  TOTAL: {total}  |  PASSED: {passed}  |  FAILED: {failed}")
            print("=" * 60)
            if failed > 0:
                print("\nFailed tests:")
                for name, st, detail in results:
                    if st == "FAIL":
                        print(f"  X {name}  ({detail})")
            sys.exit(1)

        headers = {"Authorization": f"Bearer {TOKEN}"}

        # ── 4. Get Profile ──
        r = await c.get("/api/users/me", headers=headers)
        record("GET /api/users/me", r.status_code == 200, f"{r.status_code}")

        # ── 5. Update Profile ──
        r = await c.patch("/api/users/me", headers=headers, json={
            "stage_index": 1,
        })
        record("PATCH /api/users/me", r.status_code == 200, f"{r.status_code}")

        # ── 6. Track 1: Auth Start ──
        r = await c.post("/api/task1/auth/start", json={
            "login_type": "KAKAO",
            "user_name": "홍길동",
            "user_birth": "19970315",
            "user_mobile": "01012345678",
        })
        ok = r.status_code == 200
        auth_req_id = r.json().get("data", {}).get("auth_request_id", "")
        record("POST /api/task1/auth/start", ok, f"auth_request_id={auth_req_id[:20]}")

        # ── 7. Track 1: Auth Confirm ──
        if auth_req_id:
            r = await c.post("/api/task1/auth/confirm", json={
                "auth_request_id": auth_req_id,
            })
            record("POST /api/task1/auth/confirm", r.status_code == 200, f"{r.status_code}")

        # ── 8. Track 1: Get Latest Result ──
        r = await c.get("/api/task1/refund/result", headers=headers)
        # May be 200 with null or 404
        record("GET /api/task1/refund/result", r.status_code in (200, 404), f"{r.status_code}")

        # ── 9. Track 1: Get History ──
        r = await c.get("/api/task1/refund/history", headers=headers)
        record("GET /api/task1/refund/history", r.status_code in (200, 404), f"{r.status_code}")

        # ── 10. Track 2: Create Simulation ──
        r = await c.post("/api/task2/simulations", headers=headers, json={
            "title": "테스트 시뮬레이션",
        })
        ok = r.status_code in (200, 201)
        SIMULATION_ID = r.json().get("data", {}).get("simulation_id", "")
        record("POST /api/task2/simulations", ok, f"sim_id={SIMULATION_ID[:20] if SIMULATION_ID else 'N/A'}")

        # ── 11. Track 2: List Simulations ──
        r = await c.get("/api/task2/simulations", headers=headers)
        record("GET /api/task2/simulations", r.status_code == 200, f"{r.status_code}")

        # ── 12. Track 2: Get Simulation ──
        if SIMULATION_ID:
            r = await c.get(f"/api/task2/simulations/{SIMULATION_ID}", headers=headers)
            record(f"GET /api/task2/simulations/{{id}}", r.status_code == 200, f"{r.status_code}")

        # ── 13. Track 2: Update Inputs ──
        if SIMULATION_ID:
            r = await c.patch(f"/api/task2/simulations/{SIMULATION_ID}/inputs", headers=headers, json={
                "a_market_price": 2800000000,
                "a_acquisition_price": 1500000000,
                "a_acquired_at": "2018-06-01",
                "a_is_regulated": True,
                "b_market_price": 5500000000,
                "b_acquisition_price": 2800000000,
                "b_acquired_at": "2016-03-15",
                "b_is_regulated": True,
                "donee_relation": "LINEAL_DESCENDANT_ADULT",
            })
            record("PATCH /api/task2/simulations/{id}/inputs", r.status_code == 200, f"{r.status_code}")

        # ── 14. Track 2: Calculate ──
        if SIMULATION_ID:
            r = await c.post(f"/api/task2/simulations/{SIMULATION_ID}/calculate", headers=headers, json={})
            record("POST /api/task2/simulations/{id}/calculate", r.status_code == 200, f"{r.status_code}")

        # ── 15. Track 2: Get Result ──
        if SIMULATION_ID:
            r = await c.get(f"/api/task2/simulations/{SIMULATION_ID}/result", headers=headers)
            record("GET /api/task2/simulations/{id}/result", r.status_code == 200, f"{r.status_code}")
            if r.status_code == 200:
                result_data = r.json().get("data", {})
                scenarios = result_data.get("scenarios", [])
                record("  → 6 scenarios returned", len(scenarios) == 6, f"count={len(scenarios)}")

        # ── 16. Track 2: AI Summary ──
        if SIMULATION_ID:
            r = await c.post(f"/api/task2/simulations/{SIMULATION_ID}/ai-summary", headers=headers, json={
                "tone": "SHORT",
            })
            record("POST /api/task2/simulations/{id}/ai-summary", r.status_code == 200, f"{r.status_code}")

        # ── 17. Track 2: Get Realtrade ──
        r = await c.get("/api/task2/realtrade", headers=headers, params={
            "lawd_cd": "11680",
            "deal_ymd": "202601",
        })
        record("GET /api/task2/realtrade", r.status_code == 200, f"{r.status_code}")

        # ── 18. Track 2: Policy ──
        r = await c.get("/api/task2/policy")
        record("GET /api/task2/policy", r.status_code == 200, f"{r.status_code}")

        # ── 19. Track 2: Delete Simulation ──
        if SIMULATION_ID:
            r = await c.delete(f"/api/task2/simulations/{SIMULATION_ID}", headers=headers)
            record(f"DELETE /api/task2/simulations/{{id}}", r.status_code == 200, f"{r.status_code}")

        # ── 20. Lifecycle services ──
        r = await c.get("/api/lifecycle/services", headers=headers)
        record("GET /api/lifecycle/services", r.status_code == 200, f"{r.status_code}")

        # ── 21. Logout ──
        r = await c.post("/auth/logout", headers=headers, json={
            "refresh_token": REFRESH_TOKEN,
        })
        record("POST /auth/logout", r.status_code == 200, f"{r.status_code}")

    # ── Summary ──
    print("\n" + "=" * 60)
    passed = sum(1 for _, s, _ in results if s == "PASS")
    failed = sum(1 for _, s, _ in results if s == "FAIL")
    total = len(results)
    print(f"  TOTAL: {total}  |  PASSED: {passed}  |  FAILED: {failed}")
    print("=" * 60)

    if failed > 0:
        print("\nFailed tests:")
        for name, status, detail in results:
            if status == "FAIL":
                print(f"  ✗ {name}  ({detail})")
        sys.exit(1)


if __name__ == "__main__":
    print("=" * 60)
    print("  수지하우스 백엔드 통합 테스트")
    print("=" * 60)
    asyncio.run(run_tests())
