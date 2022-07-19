import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MockService } from '../providers/mock.service';
import { timer } from 'rxjs';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-tv',
  templateUrl: './tv.component.html',
  styleUrls: ['./tv.component.scss']
})
export class TvComponent implements OnInit, OnDestroy {
  @Input() symbol;

  tradingview;

  ws;
  wsMessage = 'you may need to send specific message to subscribe data, eg: BTC';

  granularityMap = {
    '1': 60,
    '3': 180,
    '5': 300,
    '30': 30 * 60,
    '60': 60 * 60,
    '120': 60 * 60 * 2,
    '240': 60 * 60 * 4,
    '360': 60 * 60 * 6,
    'D': 86400
  };

  constructor(private mockService: MockService) {
  }

  ngOnInit() {
    this.ws = this.mockService.fakeWebSocket();

    this.ws.onopen = () => {
      console.log('fake websocket: onopen');
      this.drawTv();
    };
  }

  ngOnDestroy() {
    this.ws.close();
  }

  drawTv() {
    this.tradingview = new window.TradingView.widget({
      // debug: true, // uncomment this line to see Library errors and warnings in the console
      fullscreen: true,
      symbol: this.symbol,
      interval: '1',
      container_id: 'tradingview',
      library_path: 'assets/vendors/charting_library/',
      locale: 'en',
      disabled_features: [
        // 'timeframes_toolbar',
        // 'go_to_date',
        // 'use_localstorage_for_settings',
        'volume_force_overlay',
        // 'show_interval_dialog_on_key_press',
        'symbol_search_hot_key',
        'study_dialog_search_control',
        'display_market_status',
        /*'header_compare',
        'header_symbol_search',
        'header_fullscreen_button',
        'header_settings',
        'header_chart_type',
        'header_resolutions',*/
        'control_bar',
        'edit_buttons_in_legend',
        'border_around_the_chart',
        'main_series_scale_menu',
        'star_some_intervals_by_default',
        'datasource_copypaste',
        'header_indicators',
        // 'context_menus',
        // 'compare_symbol',
        'header_undo_redo',
        'border_around_the_chart',
        'timezone_menu',
        'remove_library_container_border',
      ],
      // enabled_features: ['study_templates'],
      // charts_storage_url: 'http://saveload.tradingview.com',
      charts_storage_api_version: '1.1',
      client_id: 'tradingview.com',
      user_id: 'public_user_id',
      timezone: 'America/New_York',
      datafeed: {
        onReady(x) {
          timer(0)
            .pipe(
              tap(() => {
                x({
                  supported_resolutions: ['1', '3', '5', '30', '60', '120', '240', '360', 'D'],
                });
              })
            ).subscribe();
        },
        getBars: (...args) => {
          const [symbol, granularity, startTime, endTime, onResult, onError, isFirst] = args;
          console.log('[getBars]:', args);
          this.mockService.getHistoryList({
            granularity: this.granularityMap[granularity],
            startTime,
            endTime
          }).subscribe((data: any) => {
            // push the history data to callback
            onResult(data, { noData: false });
          });
        },
        resolveSymbol: (symbol, onResolve, onError) => {
          console.log('[resolveSymbol]');
          timer(1e3)
            .pipe(
              tap(() => {
                onResolve({
                  name: this.symbol,
                  full_name: this.symbol,
                  base_name: this.symbol,
                  has_intraday: true,
                  description: '',
                  type: '',
                  session: '24x7',
                  exchange: '',
                  listed_exchange: '',
                  timezone: 'America/New_York',
                  minmov: 1,
                  pricescale: 100,
                  supported_resolutions: ['1', '3', '5', '30', '60', '120', '240', '360', 'D'],
                });
              })
            ).subscribe();
        },
        getServerTime: (callback) => {
          console.log('[serverTime]');
        },
        subscribeBars: (...args) => {
          const [symbol, granularity, onTick] = args;
          console.log('[subscribe], arg:', args);
          this.ws.onmessage = (e) => {
            try {
              const data = e;
              if (data) {
                // realtime data
                // data's timestamp === recent one ? Update the recent one : A new timestamp data
                onTick(data);
              }
            } catch (e) {
              console.error(e);
            }
          };

          // subscribe the realtime data
          this.ws.send(`${this.wsMessage}_kline_${this.granularityMap[granularity]}`);
        },
        unsubscribeBars: () => {
          this.ws.send('stop receiving data or just close websocket');
        },
        searchSymbols: () => { /* ts: required method */ },
      },
    });
  }
}
