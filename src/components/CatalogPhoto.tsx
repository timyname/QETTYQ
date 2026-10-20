'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { Localize, translateText, useI18n } from '../client/i18n';
import type { PlaceMedia } from '../server/media/commons-place-media';
import css from './place-photo.module.css';

export function hasRealPhoto(media?: PlaceMedia): media is Extract<PlaceMedia, { kind: 'real_place_photo' }> {
  return media?.kind === 'real_place_photo' && /^\/assets\/places\/[a-z0-9-]+\.jpg$/.test(media.src);
}

export function CatalogPhoto({ media, category, mini = false, label = true, labelClassName }: { media?: PlaceMedia; fallback: string; category: string; mini?: boolean; label?: boolean; labelClassName?: string }) {
  const { language } = useI18n();
  const [failed, setFailed] = useState<string | null>(null);
  const real = hasRealPhoto(media) && failed !== media.src;
  return <Localize>{real ? <Image src={media.src} fill sizes={mini ? '64px' : '430px'} alt={media.alt} onError={() => setFailed(media.src)} /> : <div className={css.catalogEmpty} data-mini={mini} role="img" aria-label={`${translateText('Фото пока нет', language)}: ${category}`}><MapPin size={mini ? 24 : 44} strokeWidth={1.3} />{!mini && <span>{category}</span>}</div>}{(label || failed === media?.src) && <small className={labelClassName ?? (real ? css.catalogCredit : undefined)}>{real ? <span translate="no">{media.author} · {media.license}</span> : mini ? 'Без фото' : 'Фото пока нет'}</small>}</Localize>;
}

export function CatalogPhotoCredit({ media }: { media?: PlaceMedia }) {
  if (!hasRealPhoto(media)) return null;
  return <Localize><p className={css.fullCredit} data-testid="catalog-photo-credit"><span>Автор фото:</span> <span translate="no">{media.author}</span> · <a href={media.sourceUrl} target="_blank" rel="noreferrer">Источник фото</a> · <a href={media.licenseUrl} target="_blank" rel="noreferrer" translate="no">{media.license}</a>. <span translate="no">{media.changes}</span> <span>Кадрирование для карточки.</span></p></Localize>;
}
