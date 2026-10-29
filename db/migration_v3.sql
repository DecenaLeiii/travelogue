-- Migration v3: add destination feedback table

create table if not exists destination_feedback (
  id uuid default uuid_generate_v4() primary key,
  destination_slug text not null,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

create index if not exists idx_destination_feedback_destination_slug on destination_feedback(destination_slug);
create index if not exists idx_destination_feedback_created_at on destination_feedback(created_at desc);
