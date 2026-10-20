'use client';

import { useState } from 'react';
import { Localize } from '../client/i18n';
import type { GooglePlacePhoto } from '../server/pilot/google-place-photos';
import { googleMapsLink, googlePhotoUri } from '../server/pilot/google-place-photos';
import css from './place-photo.module.css';

export function GooglePhoto({ photo, name }: { photo: GooglePlacePhoto | null | undefined; name: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const uri = googlePhotoUri(photo?.uri), source = googleMapsLink(photo?.sourceUrl);
  if (!photo || !uri || !source || failed === uri) return null;
  return <Localize><figure className={css.googlePhoto} data-testid="google-place-photo">
    {/* Google imagery must not pass through an image optimizer/cache. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={uri} alt={name} translate="no" width={800} height={500} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(uri)} />
    <figcaption><a href={source} target="_blank" rel="noreferrer">Фото в Google Maps</a>{photo.authors.map((author, i) => {
      const href = googleMapsLink(author.url);
      return href ? <a key={i} href={href} target="_blank" rel="noreferrer" translate="no">{author.name}</a> : <span key={i} translate="no">{author.name}</span>;
    })}</figcaption>
  </figure></Localize>;
}
