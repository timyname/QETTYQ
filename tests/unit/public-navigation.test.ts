import {describe,it,expect} from 'vitest';
import {parsePublicRoute,publicRouteHash,screenPublicRoute} from '../../src/client/public-navigation';
describe('public navigation without personal state',()=>{
  it('round-trips public screens, OSM IDs and occurrence timestamps',()=>{
    for(const route of [{screen:'feed'},{screen:'chat'},{screen:'map'},{screen:'detail',id:'osm:node:123'},
      {screen:'event',id:'sxodim:123:2026-10-24T15:00:00+05:00'}] as const)expect(parsePublicRoute(publicRouteHash(route))).toEqual(route);
  });
  it.each(['#/place/javascript%3Aalert(1)','#/event/%2Fprivate','#/event/%E0%A4%A','#/map?lat=51.123456','#/chat/private','#/event/a#x','#/event/'+ 'a'.repeat(257)])('rejects malformed or extra state: %s',hash=>expect(parsePublicRoute(hash)).toBeNull());
  it('never serializes private plan/draft state or unknown screens',()=>{
    expect(screenPublicRoute('plan')).toBeNull();expect(screenPublicRoute('organizer')).toBeNull();expect(screenPublicRoute('detail')).toBeNull();
  });
});
