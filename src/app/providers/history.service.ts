import { Injectable } from '@angular/core';
import { Observable, Observer, interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { BTC_PRICE_LIST } from '../mock/btc-181123_2006-181124_0105';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  static dataTemplate = { 'time': 1545572340000, 'open': 3917, 'high': 3917, 'low': 3912.03, 'close': 3912.62, 'volume': 3896 };
  static dataIndex = 0;
  static dataLength = BTC_PRICE_LIST.length;

  static dataGenerator(time = +new Date()) {
    const obj: any = {};
    Object.assign(obj, BTC_PRICE_LIST[this.dataIndex], { time });
    ++this.dataIndex >= this.dataLength && (this.dataIndex = 0);
    return obj;
  }

  constructor() {
  }

  getList(param) {
    const list = [];
    let timePoint = param.startTime * 1e3;
    const now = +new Date();
    while (timePoint < now) {
      list.push(HistoryService.dataGenerator(timePoint));
      timePoint += param.granularity * 1e3;
    }

    return Observable.create((ob: Observer<any>) => {
      ob.next(list);
      ob.complete();
    });
  }

  fakeWebSocket() {
    const ws: any = {
      send() {
      },
      close() {
      }
    };

    setTimeout(() => {
      ws.onopen();

      interval(3e3)
        .pipe(
          map(() => HistoryService.dataGenerator())
        ).subscribe(x => {
        ws.onmessage && ws.onmessage(x);
      });
    }, 1e3);

    return ws;
  }
}
