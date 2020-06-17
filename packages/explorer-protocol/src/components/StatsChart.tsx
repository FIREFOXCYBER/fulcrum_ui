import React, { Component } from "react";
import { Asset } from "../domain/Asset";
import { GroupButton } from "./GroupButton";
import { Line } from "react-chartjs-2";
import { AssetsDictionary } from "../domain/AssetsDictionary";
import { AssetDetails } from "../domain/AssetDetails";

interface IStatsChartProps {
}

interface IStatsChartState {
  asset: Asset
  periodChart: number;
  labels: Array<number>;
  utilization: Array<number>;
  apr: Array<number>;
  tvl: Array<number>;
}

export class StatsChart extends Component<IStatsChartProps, IStatsChartState> {
  private apiUrl = "https://api.bzx.network/v1";
  private assetsShown: Asset[];
  constructor(props: any) {
    super(props);
    this.state = {
      asset: Asset.UNKNOWN,
      periodChart: 1,
      labels: [],
      tvl: [],
      apr: [],
      utilization: []
    };
    this.assetsShown = [
      Asset.ETH,
      Asset.SAI,
      Asset.DAI,
      Asset.USDC,
      Asset.USDT,
      Asset.SUSD,
      Asset.WBTC,
      Asset.LINK,
      Asset.ZRX,
      Asset.REP,
      Asset.KNC
    ]
  }
  public componentWillMount(): void {
    const pathname = window.location.pathname;
    const assetString = pathname.replace('/stats/', '');
    const asset = this.assetsShown.filter((item) => {
      return item === assetString.toUpperCase();
    });
    this.setState({ ...this.state, asset: asset[0] })
  }
  public componentDidMount(): void {
    this.getAssetStatsHistory();
  }

  public componentDidUpdate(prevProps: Readonly<IStatsChartProps>, prevState: Readonly<IStatsChartState>, snapshot?: any): void {
    if (this.state.periodChart !== prevState.periodChart) {
      this.getAssetStatsHistory();
    }
  }

  public getAssetStatsHistory = async () => {
    const startData = new Date().setDate(new Date().getDate() - this.state.periodChart);
    const endData = new Date().getTime();
    const pointsNumber = 30;
    const requestUrl = `${this.apiUrl}/asset-stats-history?asset=${this.state.asset.toLowerCase()}&start_date=${startData}&end_date=${endData}&points_number=${pointsNumber}`;
    const response = await fetch(requestUrl);
    const responseJson = await response.json();

    let labels: any = [];
    let tvl: any = [];
    let apr: any = [];
    let utilization: any = [];

    if (responseJson.success) {
      responseJson.data.forEach(function (item: any) {
        labels.push(new Date(item["timestamp"] * 1000).getDate());
        tvl.push(+item["tvl"]);
        apr.push(+item["supplyInterestRate"]);
        utilization.push(+item["utilization"]);
      });
    } else {
      console.error(responseJson.message)
    }
    await this.setState({ ...this.state, tvl: tvl, apr: apr, utilization: utilization, labels: labels })
  }

  public render() {
    const asset = AssetsDictionary.assets.get(this.state.asset) as AssetDetails;

    const getData = (canvas: any) => {
      const ctx: any = canvas.getContext("2d");

      return {
        labels: this.state.labels,
        datasets: [{
          label: 'TVL',
          data: this.state.tvl,
          backgroundColor: "transparent",
          borderColor: '#276BFB',
          borderWidth: 1,
          order: 1
        },
        {
          label: 'Supply APR, %',
          data: this.state.apr,
          backgroundColor: "transparent",
          borderColor: '#33DFCC',
          borderWidth: 1,
          order: 2
        },
        {
          label: 'Utilization, %',
          data: this.state.utilization,
          backgroundColor: "transparent",
          borderColor: '#B79EFF',
          borderWidth: 1,
          order: 3
        }]
      }
    }
    const canvas = document.createElement('canvas');
    const chartData = getData(canvas);
    const options = {
      scaleShowLabels: false,
      scales: {
        xAxes: [{
          gridLines: {
            display: false
          },
        }],
        yAxes: [{
          display: false,
        }]
      },
      legend: {
        display: false
      },
      /*elements: {
        point: {
          radius: 0
        }
      }*/
    }
    return (
      <React.Fragment>
        <div className="flex jc-sb ai-c mb-25">
          <div className="flex ai-c">
            <span className="mr-15">
              {asset.logoSvg.render()}
            </span>
            <h1>{this.state.asset.toUpperCase()} Stats</h1>
          </div>
          <GroupButton setPeriodChart={this.setPeriodChart} />
        </div>
        <Line ref="chart" data={chartData} options={options} height={50} />
      </React.Fragment>
    );
  }

  public setPeriodChart = (period: number) => {
    this.setState({ ...this.state, periodChart: period })
  }
}