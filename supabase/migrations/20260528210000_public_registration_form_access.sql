create policy "programs_select_public_published"
on public.programs
for select
to anon
using (
  visibility = 'public'
  or exists (
    select 1
    from public.published_pages pp
    where pp.program_id = programs.id
      and pp.is_active = true
  )
);

create policy "forms_select_public_active_registration"
on public.forms
for select
to anon
using (
  kind = 'registration'
  and status = 'active'
  and exists (
    select 1
    from public.published_pages pp
    where pp.program_id = forms.program_id
      and pp.is_active = true
  )
);

create policy "form_versions_select_public_active_registration"
on public.form_versions
for select
to anon
using (
  exists (
    select 1
    from public.forms f
    where f.id = form_versions.form_id
      and f.kind = 'registration'
      and f.status = 'active'
      and f.active_version_id = form_versions.id
      and exists (
        select 1
        from public.published_pages pp
        where pp.program_id = f.program_id
          and pp.is_active = true
      )
  )
);

create policy "form_fields_select_public_active_registration"
on public.form_fields
for select
to anon
using (
  exists (
    select 1
    from public.form_versions fv
    join public.forms f on f.id = fv.form_id
    where fv.id = form_fields.form_version_id
      and f.kind = 'registration'
      and f.status = 'active'
      and f.active_version_id = fv.id
      and exists (
        select 1
        from public.published_pages pp
        where pp.program_id = f.program_id
          and pp.is_active = true
      )
  )
);

create policy "form_field_choices_select_public_active_registration"
on public.form_field_choices
for select
to anon
using (
  exists (
    select 1
    from public.form_fields ff
    join public.form_versions fv on fv.id = ff.form_version_id
    join public.forms f on f.id = fv.form_id
    where ff.id = form_field_choices.form_field_id
      and f.kind = 'registration'
      and f.status = 'active'
      and f.active_version_id = fv.id
      and exists (
        select 1
        from public.published_pages pp
        where pp.program_id = f.program_id
          and pp.is_active = true
      )
  )
);

create policy "form_field_conditions_select_public_active_registration"
on public.form_field_conditions
for select
to anon
using (
  exists (
    select 1
    from public.form_fields ff
    join public.form_versions fv on fv.id = ff.form_version_id
    join public.forms f on f.id = fv.form_id
    where ff.id = form_field_conditions.form_field_id
      and f.kind = 'registration'
      and f.status = 'active'
      and f.active_version_id = fv.id
      and exists (
        select 1
        from public.published_pages pp
        where pp.program_id = f.program_id
          and pp.is_active = true
      )
  )
);
