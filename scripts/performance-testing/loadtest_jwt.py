"""
Pet Daylight 부하테스트 - JWT 인증 포함
- JWT 토큰 방식 로그인
- 실제 사용자 시뮬레이션
- 전체 API 테스트

⚠️ 사용 전 준비:
1. Django에서 테스트 계정 생성
2. 아래 username, password 수정
"""

from locust import HttpUser, task, between
import random

class AuthenticatedUser(HttpUser):
    """
    로그인된 사용자 시뮬레이션
    """
    wait_time = between(1, 3)
    
    def on_start(self):
        """테스트 시작 시 로그인 + ID 수집"""
        
        # ===================================
        # 🔥 여기를 수정하세요!
        # ===================================
        login_data = {
            "username": "",      # ← 실제 테스트 계정 아이디
            "password": ""   # ← 실제 테스트 계정 비밀번호
        }
        
        # 로그인 시도
        try:
            response = self.client.post(
                "/api/accounts/login/",
                json=login_data,
                name="[AUTH] 로그인"
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # JWT Access 토큰 추출
                if 'tokens' in data and 'access' in data['tokens']:
                    access_token = data['tokens']['access']
                    
                    # 모든 요청에 JWT 토큰 포함
                    self.client.headers.update({
                        'Authorization': f'Bearer {access_token}'
                    })
                    
                    print(f"✅ 로그인 성공! User: {data.get('user', {}).get('username', 'unknown')}")
                else:
                    print(f"❌ 로그인 응답에 토큰 없음: {data}")
                    return
            else:
                print(f"❌ 로그인 실패! Status: {response.status_code}, Response: {response.text}")
                return
                
        except Exception as e:
            print(f"❌ 로그인 에러: {str(e)}")
            return
        
        # 실제 ID 수집
        self.valid_pet_ids = []
        self.valid_community_ids = []
        self.valid_hospital_ids = []
        self.valid_lifecycle_pet_ids = []
        
        # 실종동물 ID 수집
        try:
            response = self.client.get("/api/missing-pets/", name="[SETUP] 실종동물 목록")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.valid_pet_ids = [item['id'] for item in data if 'id' in item]
                elif isinstance(data, dict) and 'results' in data:
                    self.valid_pet_ids = [item['id'] for item in data['results'] if 'id' in item]
                print(f"✅ 실종동물 ID {len(self.valid_pet_ids)}개 수집")
        except Exception as e:
            print(f"⚠️ 실종동물 ID 수집 실패: {str(e)}")
        
        # 커뮤니티 ID 수집
        try:
            response = self.client.get("/api/communities/", name="[SETUP] 커뮤니티 목록")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.valid_community_ids = [item['id'] for item in data if 'id' in item]
                elif isinstance(data, dict) and 'results' in data:
                    self.valid_community_ids = [item['id'] for item in data['results'] if 'id' in item]
                print(f"✅ 커뮤니티 ID {len(self.valid_community_ids)}개 수집")
        except Exception as e:
            print(f"⚠️ 커뮤니티 ID 수집 실패: {str(e)}")
        
        # 병원 ID 수집
        try:
            response = self.client.get("/api/hospitals/", name="[SETUP] 병원 목록")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.valid_hospital_ids = [item['id'] for item in data if 'id' in item]
                elif isinstance(data, dict) and 'results' in data:
                    self.valid_hospital_ids = [item['id'] for item in data['results'] if 'id' in item]
                print(f"✅ 병원 ID {len(self.valid_hospital_ids)}개 수집")
        except Exception as e:
            print(f"⚠️ 병원 ID 수집 실패: {str(e)}")
        
        # 라이프사이클 펫 ID 수집
        try:
            response = self.client.get("/api/lifecycles/pets/", name="[SETUP] 라이프사이클 펫 목록")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.valid_lifecycle_pet_ids = [item['id'] for item in data if 'id' in item]
                elif isinstance(data, dict) and 'results' in data:
                    self.valid_lifecycle_pet_ids = [item['id'] for item in data['results'] if 'id' in item]
                print(f"✅ 라이프사이클 펫 ID {len(self.valid_lifecycle_pet_ids)}개 수집")
        except Exception as e:
            print(f"⚠️ 라이프사이클 펫 ID 수집 실패: {str(e)}")
    
    # ==========================================
    # 실종동물 관련 (인증 필요)
    # ==========================================
    @task(15)
    def view_missing_pets_list(self):
        """실종동물 목록 조회"""
        self.client.get("/api/missing-pets/", name="실종동물 목록")
    
    @task(5)
    def view_missing_pet_detail(self):
        """실종동물 상세 조회"""
        if self.valid_pet_ids:
            pet_id = random.choice(self.valid_pet_ids)
            self.client.get(f"/api/missing-pets/{pet_id}/", name="실종동물 상세")
        else:
            self.client.get("/api/missing-pets/", name="실종동물 목록(대체)")
    
    @task(2)
    def search_with_filters(self):
        """필터 검색"""
        params = {
            'species': random.choice(['dog', 'cat']),
            'page': 1
        }
        self.client.get("/api/missing-pets/", params=params, name="필터 검색")
    
    # ==========================================
    # 라이프사이클 관련
    # ==========================================
    @task(12)
    def view_lifecycle_guides(self):
        """라이프사이클 가이드 조회 (공개 가능)"""
        self.client.get("/api/lifecycles/guides/", name="라이프사이클 가이드")
    
    @task(10)
    def view_my_pets(self):
        """내 반려동물 목록 (인증 필요)"""
        self.client.get("/api/lifecycles/pets/", name="내 펫 목록")
    
    @task(4)
    def view_my_pet_detail(self):
        """내 펫 상세 (인증 필요)"""
        if self.valid_lifecycle_pet_ids:
            pet_id = random.choice(self.valid_lifecycle_pet_ids)
            self.client.get(f"/api/lifecycles/pets/{pet_id}/", name="내 펫 상세")
        else:
            self.client.get("/api/lifecycles/pets/", name="내 펫 목록(대체)")
    
    @task(3)
    def view_vaccinations(self):
        """접종 기록 (인증 필요)"""
        self.client.get("/api/lifecycles/vaccinations/", name="접종 기록")
    
    @task(2)
    def view_health_records(self):
        """건강 기록 (인증 필요)"""
        self.client.get("/api/lifecycles/health-records/", name="건강 기록")
    
    @task(3)
    def filter_lifecycle_by_species(self):
        """종류별 가이드 필터링"""
        species = random.choice(['dog', 'cat'])
        self.client.get(
            f"/api/lifecycles/guides/?species={species}",
            name="가이드 필터(종류)"
        )
    
    # ==========================================
    # 병원 관련 (공개)
    # ==========================================
    @task(8)
    def search_hospitals(self):
        """병원 검색"""
        locations = [
            (37.5665, 126.9780),  # 시청
            (37.5511, 126.9882),  # 강남역
            (37.5797, 126.9772),  # 홍대입구역
            (37.5056, 127.0508),  # 잠실역
        ]
        lat, lng = random.choice(locations)
        self.client.get(
            f"/api/hospitals/?lat={lat}&lng={lng}&radius=5000",
            name="병원 검색"
        )
    
    @task(4)
    def view_hospital_detail(self):
        """병원 상세"""
        if self.valid_hospital_ids:
            hospital_id = random.choice(self.valid_hospital_ids)
            self.client.get(f"/api/hospitals/{hospital_id}/", name="병원 상세")
        else:
            self.client.get("/api/hospitals/", name="병원 목록(대체)")
    
    # ==========================================
    # 커뮤니티 관련 (공개)
    # ==========================================
    @task(8)
    def view_communities(self):
        """커뮤니티 목록"""
        self.client.get("/api/communities/", name="커뮤니티 목록")
    
    @task(4)
    def view_community_detail(self):
        """커뮤니티 상세"""
        if self.valid_community_ids:
            post_id = random.choice(self.valid_community_ids)
            self.client.get(f"/api/communities/{post_id}/", name="커뮤니티 상세")
        else:
            self.client.get("/api/communities/", name="커뮤니티 목록(대체)")
    
    # ==========================================
    # 내 정보 조회 (인증 필요)
    # ==========================================
    @task(2)
    def view_my_profile(self):
        """내 프로필 조회"""
        self.client.get("/api/accounts/me/", name="내 프로필")
