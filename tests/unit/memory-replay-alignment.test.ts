import {describe,it,expect} from 'vitest';
import {persistedReplayClocks} from '../../src/server/memory/replay-alignment';
describe('internal persisted clock alignment',()=>{
  const history=[{role:'user',text:'Завтра музей'},{role:'assistant',text:'Уточняю.'}],clocks=[100,101];
  it('uses only an exact server-returned transcript and clock vector',()=>expect(persistedReplayClocks(history,{history,historyCreatedAtMs:clocks},200)).toEqual(clocks));
  it('rejects reordered, edited or partial transcripts',()=>{
    const saved={history,historyCreatedAtMs:clocks};
    for(const altered of [[...history].reverse(),history.slice(0,1),[{role:'user',text:'Завтра кофе'},history[1]]])expect(persistedReplayClocks(altered,saved,200)).toBeUndefined();
  });
  it('rejects missing, invalid, future or misaligned clocks',()=>{
    for(const vector of [undefined,[100],[100,201],[100,-1],[100,NaN]])expect(persistedReplayClocks(history,{history,historyCreatedAtMs:vector},200)).toBeUndefined();
    expect(persistedReplayClocks([],null,200)).toBeUndefined();
  });
});
