import * as React from 'react';
// import './index.css';
import {
	widget,
	ChartingLibraryWidgetOptions,
	LanguageCode,
	IChartingLibraryWidget,
	StudyOverrides
} from '../charting_library/charting_library.min';

export interface ChartContainerProps {
	symbol: ChartingLibraryWidgetOptions['symbol'];
	interval: ChartingLibraryWidgetOptions['interval'];

	// BEWARE: no trailing slash is expected in feed URL
	datafeedUrl: string;
	libraryPath: ChartingLibraryWidgetOptions['library_path'];
	chartsStorageUrl: ChartingLibraryWidgetOptions['charts_storage_url'];
	chartsStorageApiVersion: ChartingLibraryWidgetOptions['charts_storage_api_version'];
	clientId: ChartingLibraryWidgetOptions['client_id'];
	userId: ChartingLibraryWidgetOptions['user_id'];
	fullscreen: ChartingLibraryWidgetOptions['fullscreen'];
	autosize: ChartingLibraryWidgetOptions['autosize'];
	studiesOverrides: ChartingLibraryWidgetOptions['studies_overrides'];
	containerId: ChartingLibraryWidgetOptions['container_id'];
	theme: ChartingLibraryWidgetOptions['theme'];
	preset: ChartingLibraryWidgetOptions['preset']
}

export interface ChartContainerState {
	preset: ChartingLibraryWidgetOptions['preset']

}

function getLanguageFromURL(): LanguageCode | null {
	const regex = new RegExp('[\\?&]lang=([^&#]*)');
	const results = regex.exec(location.search);
	return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' ')) as LanguageCode;
}

export class TVChartContainer extends React.PureComponent<Partial<ChartContainerProps>, ChartContainerState> {
	constructor(props: ChartContainerProps, context?: any) {
		super(props, context);
		this.state = {
			preset: this.props.preset
		}
	}
	public static defaultProps: ChartContainerProps = {
		symbol: 'ETH',
		interval: 'D',
		containerId: 'tv_chart_container',
		datafeedUrl: 'https://api.kyber.network/chart',
		libraryPath: '/charting_library/',
		chartsStorageUrl: 'https://saveload.tradingview.com',
		chartsStorageApiVersion: '1.1',
		clientId: 'tradingview.com',
		userId: 'public_user_id',
		fullscreen: false,
		autosize: true,
		studiesOverrides: {},
		theme: 'Dark',
		preset: undefined
	};

	private tvWidget: IChartingLibraryWidget | null = null;

	public componentDidMount(): void {
		const widgetOptions: ChartingLibraryWidgetOptions = {
			symbol: this.props.symbol as string,
			// BEWARE: no trailing slash is expected in feed URL
			// tslint:disable-next-line:no-any
			datafeed: new (window as any).Datafeeds.UDFCompatibleDatafeed(this.props.datafeedUrl),
			interval: this.props.interval as ChartingLibraryWidgetOptions['interval'],
			container_id: this.props.containerId as ChartingLibraryWidgetOptions['container_id'],
			library_path: this.props.libraryPath as string,

			locale: getLanguageFromURL() || 'en',
			disabled_features: ['use_localstorage_for_settings'],
			enabled_features: ['study_templates'],
			charts_storage_url: this.props.chartsStorageUrl,
			charts_storage_api_version: this.props.chartsStorageApiVersion,
			client_id: this.props.clientId,
			user_id: this.props.userId,
			fullscreen: this.props.fullscreen,
			autosize: this.props.autosize,
			studies_overrides: this.props.studiesOverrides,
			theme: this.props.theme,
			preset: this.state.preset
		};

		const tvWidget = new widget(widgetOptions);
		this.tvWidget = tvWidget;
	}

	public changePair(baseSymbol: string) {
		var widget = this.tvWidget;
		if (widget) {
			widget.onChartReady(() => {
				if (widget) {

					const chart = widget.chart();
					const symbol = `${baseSymbol}_SAI`
					chart.setSymbol(symbol, function e() { });
				}
			});
		}
	}

	public componentWillUnmount(): void {
		if (this.tvWidget !== null) {
			this.tvWidget.remove();
			this.tvWidget = null;
		}
	}

	public componentDidUpdate(): void {
		if (this.tvWidget) {
			this.tvWidget.remove();
			this.tvWidget = null;
		}
		// this.setState({...this.state, preset: this.props.preset });
		const widgetOptions: ChartingLibraryWidgetOptions = {
			symbol: `${this.props.symbol}_SAI` as string,
			// BEWARE: no trailing slash is expected in feed URL
			// tslint:disable-next-line:no-any
			datafeed: new (window as any).Datafeeds.UDFCompatibleDatafeed(this.props.datafeedUrl),
			interval: this.props.interval as ChartingLibraryWidgetOptions['interval'],
			container_id: this.props.containerId as ChartingLibraryWidgetOptions['container_id'],
			library_path: this.props.libraryPath as string,

			locale: getLanguageFromURL() || 'en',
			disabled_features: ['use_localstorage_for_settings'],
			enabled_features: ['study_templates'],
			charts_storage_url: this.props.chartsStorageUrl,
			charts_storage_api_version: this.props.chartsStorageApiVersion,
			client_id: this.props.clientId,
			user_id: this.props.userId,
			fullscreen: this.props.fullscreen,
			autosize: this.props.autosize,
			studies_overrides: this.props.studiesOverrides,
			theme: this.props.theme,
			preset: this.props.preset
		};

		const tvWidget = new widget(widgetOptions);
		this.tvWidget = tvWidget;
}

	public render(): JSX.Element {
	if (this.props.symbol)
		this.changePair(this.props.symbol)


	return (
		<div
			id={this.props.containerId}
			className={'TVChartContainer'}
		/>
	);
}
}