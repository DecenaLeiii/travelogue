-- Optional nickname shown with tourist feedback (blank = "Anonymous Tourist").
alter table destination_feedback add column if not exists nickname text;
