import { Injectable } from '@angular/core';
import { Observable, Observer, interval, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { BTC_PRICE_LIST } from '../mock/btc-181123_2006-181124_0105';

interface BarData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable({
  providedIn: 'root'
})
export class MockService {
  static dataTemplate: BarData = { 'time': 1545572340000, 'open': 3917, 'high': 3917, 'low': 3912.03, 'close': 3912.62, 'volume': 3896 };
  static dataIndex = 0;
  static dataLength = BTC_PRICE_LIST.length;

  lastBarTimestamp: number;

  static dataGenerator(time = +new Date()): BarData {
    const obj: any = {};
    Object.assign(obj, BTC_PRICE_LIST[this.dataIndex], { time });
    ++this.dataIndex >= this.dataLength && (this.dataIndex = 0);
    return obj;
  }

  constructor() {
  }

  getHistoryList(param): Observable<BarData[]> {
    const list = [];
    let timePoint = +new Date(param.startTime * 1e3).setSeconds(0, 0);
    const now = +new Date();
    while (timePoint < now) {
      this.lastBarTimestamp = timePoint;
      list.push(MockService.dataGenerator(timePoint));
      timePoint += param.granularity * 1e3;
    }

    return new Observable((ob: Observer<any>) => {
      ob.next(list);
      ob.complete();
    });
  }

  fakeWebSocket() {
    let granularity: number;
    let subscription: Subscription;

    const ws: any = {
      send(message: string) {
        const matched = message.match(/.+_kline_(\d+)/);

        // if matched, then send data based on granularity
        // else unsubscribe, which means to close connection in this example
        if (matched) {
          granularity = +matched[1] * 1e3;
          sendData();
        } else {
          subscription.unsubscribe();
        }
      },
      close() {
      }
    };

    const sendData = () => {
      const duration = 3e3;
      subscription = interval(duration)
        .pipe(
          /*
           * mock data, no need to care about the logic if you use server data
           * the point is the time of the data
           * data.time === last.time => update
           * data.time !== last.time => draw new bar
           */
          map(() => {
            const currentTimestamp = +new Date();
            if (currentTimestamp - this.lastBarTimestamp >= granularity) {
              /* time goes to next, generate new one */
              this.lastBarTimestamp += granularity;
              return MockService.dataGenerator(this.lastBarTimestamp);
            } else if (currentTimestamp + duration - this.lastBarTimestamp >= granularity) {
              // next one will be new one, get data from local, then return to client
              // so old bars will be real data
              return { ...BTC_PRICE_LIST[MockService.dataIndex], time: this.lastBarTimestamp, };
            } else {
              /* simulate real time update, update the one that last time returned */
              const data = BTC_PRICE_LIST[MockService.dataIndex];
              const priceChanged = Math.random() * 10 - 10 / 2; // make price change in same step
              return {
                time: this.lastBarTimestamp,
                open: data.open + priceChanged,
                close: data.close + priceChanged,
                low: data.low + priceChanged,
                high: data.high + priceChanged,
                amount: Math.abs(data.amount + Math.random() * 10 - 10 / 2),
                count: Math.abs(data.count + Math.random() * 10 - 10 / 2),
                volume: Math.abs(data.volume + Math.random() * 10 - 10 / 2),
              };
            }
          })
        )
        .subscribe(x => {
          ws.onmessage && ws.onmessage(x);
        });
    };

    // simulate open websocket after one second
    setTimeout(() => {
      ws.onopen();
    }, 1e3);

    return ws;
  }
}
