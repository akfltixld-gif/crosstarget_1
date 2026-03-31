-- ① profiles 테이블 생성
create table public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  email      text not null,
  name       text,
  status     text not null default 'pending',  -- pending | approved | rejected
  created_at timestamptz not null default now()
);

-- ② Row Level Security 활성화
alter table public.profiles enable row level security;

-- ③ 본인 프로필 조회 허용
create policy "본인 프로필 조회"
  on public.profiles for select
  using (auth.uid() = id);

-- ④ 서비스 롤(서버)은 전체 접근 허용
create policy "서비스 롤 전체 접근"
  on public.profiles for all
  using (auth.role() = 'service_role');

-- ⑤ 인증된 사용자는 전체 프로필 조회 가능 (관리자 페이지용)
create policy "인증 사용자 전체 조회"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- ⑥ 인증된 사용자는 상태 업데이트 가능 (관리자가 승인/거절)
create policy "인증 사용자 상태 업데이트"
  on public.profiles for update
  using (auth.role() = 'authenticated');

-- ⑦ 신규 가입 시 profiles 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
