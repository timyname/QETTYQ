'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Localize } from '../client/i18n';
import type { PlaceMedia } from '../server/media/commons-place-media';
import css from './place-photo.module.css';

export function hasRealPhoto(media?: PlaceMedia): media is Extract<PlaceMedia, { kind: 'real_place_photo' }> {
  return media?.kind === 'real_place_photo' && /^\/assets\/places\/[a-z0-9-]+\.jpg$/.test(media.src);
}

export function CatalogPhoto({ media, fallback, category, mini = false, label = true, labelClassName }: { media?: PlaceMedia; fallback: string; category: string; mini?: boolean; label?: boolean; labelClassName?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const real = hasRealPhoto(media) && failed !== media.src;
  return <Localize><Image src={real ? media.src : fallback} fill sizes={mini ? '64px' : '430px'} alt={real ? media.alt : mini ? '' : `Иллюстрация категории: ${category}`} onError={real ? () => setFailed(media.src) : undefined} />{(label || failed === media?.src) && <small className={labelClassName ?? (real ? css.catalogCredit : undefined)}>{real ? <span translate="no">{media.author} · {media.license}</span> : mini ? 'Иллюстрация' : 'Иллюстрация категории, не фото места'}</small>}</Localize>;
}

export function CatalogPhotoCredit({ media }: { media?: PlaceMedia }) {
  if (!hasRealPhoto(media)) return null;
  return <Localize><p className={css.fullCredit} data-testid="catalog-photo-credit"><span>Автор фото:</span> <span translate="no">{media.author}</span> · <a href={media.sourceUrl} target="_blank" rel="noreferrer">Источник фото</a> · <a href={media.licenseUrl} target="_blank" rel="noreferrer" translate="no">{media.license}</a>. <span translate="no">{media.changes}</span> <span>Кадрирование для карточки.</span></p></Localize>;
}
