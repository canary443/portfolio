# Team project media design

## Goal

Let the admin add multiple photos and optional video to team projects. Show them on the public project cards and modal with the same behavior as projects for sale.

## Data

Extend `TeamProject` with optional fields:

- `imgs?: string[]`
- `video?: string | null`
- keep `img?: string | null`

`img` stays for projects already saved in localStorage. When `imgs` is missing, the public page and editor use `img` as a one-photo list.

## Admin

The Team projects form gets the existing media controls used by Projects for sale:

- Select up to eight image files.
- Limit each image to about 400 KB.
- Show a removable preview for every selected image.
- The first image is the card cover.
- Select one optional MP4 or WebM video up to about 2.5 MB, or enter a video URL.
- A local video upload clears the video URL field.
- Editing restores the saved photo list and either the local video or video URL.

Saving writes `imgs`, `img: imgs[0] || null`, and `video` to the team project. Existing single-image data remains valid.

## Public site

Convert each team project to the existing shared `Item` shape:

- Use `imgs` when it has items.
- Otherwise use legacy `img` as one item.
- Pass `video` when present.

The existing cards and modal provide all display behavior:

- Video has priority when both video and photos are present.
- Video is muted, looped, and uses the existing card and modal sizing.
- Without video, multiple photos use the existing arrows, dots, crossfade, and modal carousel.
- A project with no media keeps the current placeholder.

## Scope

Only `lib/data.ts`, `app/admin/page.tsx`, and `app/page.tsx` need media changes. Existing Projects for sale behavior, stored data, and all other sections stay unchanged.

## Checks

Add a small source-level check for TeamProject media support. Run it with the existing cursor and no-magnetic checks, then run `npm run build`.
