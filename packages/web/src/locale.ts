/**
 * 中英文文案统一管理
 */

export type Lang = 'zh' | 'en';

export const locale: Record<
  Lang,
  {
    appTitle: string;
    pwaInstallPrompt: string;
    pwaInstallDismiss: string;
    navGraph: string;
    navSettings: string;
    navData: string;
    dataTitle: string;
    dataClose: string;
    viewGraph: string;
    viewBar: string;
    viewPie: string;
    viewLine: string;
    viewScatter: string;
    dataTabTable: string;
    dataTabView: string;
    tableIndex: string;
    tableId: string;
    tableName: string;
    tableColumnSelectHint: string;
    chartXAxis: string;
    chartYAxis: string;
    chartSeriesAxis: string;
    chartSeriesNone: string;
    chartDataMapping: string;
    chartDataMappingIntro: string;
    chartYColumnsLabel: string;
    chartAddYColumn: string;
    chartAddYColumnHint: string;
    chartSelectColumnsHint: string;
    chartRemove: string;
    chartAxesSection: string;
    chartDisplaySection: string;
    loadSelectFile: string;
    loadImportFile: string;
    loadLoading: string;
    loadExample: string;
    loadError: string;
    graphEmpty: string;
    graphEmptySub: string;
    loadDropHint: string;
    tabUntitled: string;
    exportSvg: string;
    exportImage: string;
    viewReset: string;
    detailTitle: string;
    detailClose: string;
    detailEmptyHint: string;
    detailNode: string;
    detailEdge: string;
    detailId: string;
    detailName: string;
    detailRole: string;
    detailShape: string;
    detailDtype: string;
    detailOperatorId: string;
    detailSource: string;
    detailTarget: string;
    detailMetadata: string;
    detailGraph: string;
    detailOperators: string;
    detailTensors: string;
    detailInputs: string;
    detailOutputs: string;
    settingsTitle: string;
    settingsTheme: string;
    settingsThemeMode: string;
    settingsThemeLight: string;
    settingsThemeDark: string;
    settingsThemePreset: string;
    settingsSilentMode: string;
    settingsSilentOff: string;
    settingsSilentOn: string;
    settingsPreset: string;
    settingsPresetLight1: string;
    settingsPresetLight2: string;
    settingsPresetLight3: string;
    settingsPresetLight4: string;
    settingsPresetLight5: string;
    settingsPresetLight6: string;
    settingsPresetDark1: string;
    settingsPresetDark2: string;
    settingsPresetDark3: string;
    settingsPresetDark4: string;
    settingsPresetDark5: string;
    settingsPresetDark6: string;
    settingsTabPreset: string;
    settingsTabLayout: string;
    settingsTabLines: string;
    settingsTabColors: string;
    settingsEdgeWidth: string;
    settingsEdgeCurvature: string;
    settingsNodeCornerRadius: string;
    settingsNodeStrokeWidth: string;
    settingsNodeTextColor: string;
    settingsEdgeLabelShape: string;
    settingsNodeLabelAttrs: string;
    settingsShowWeightNodes: string;
    settingsShowIONodes: string;
    settingsNodeNameBold: string;
    settingsNodeNameItalic: string;
    settingsNodeAttrBold: string;
    settingsNodeAttrItalic: string;
    settingsSectionText: string;
    settingsSectionUi: string;
    settingsSectionLayout: string;
    settingsSectionLines: string;
    settingsSectionChart: string;
    settingsSectionChartSize: string;
    settingsSectionChartTitles: string;
    settingsSectionChartAxis: string;
    settingsSectionChartGrid: string;
    settingsSectionChartLegend: string;
    settingsSectionChartBar: string;
    settingsSectionChartLine: string;
    settingsSectionChartScatter: string;
    settingsSectionChartPie: string;
    settingsSectionChartDataLabels: string;
    settingsChartSeriesKey: string;
    settingsChartWidth: string;
    settingsChartHeight: string;
    settingsChartSize: string;
    settingsChartBarGap: string;
    settingsChartBarGapInner: string;
    settingsChartBarGapOuter: string;
    settingsChartLineWidth: string;
    settingsChartScatterRadius: string;
    settingsChartLabelFontSize: string;
    settingsChartPieStroke: string;
    settingsChartPadding: string;
    settingsChartTitle: string;
    settingsChartXTitle: string;
    settingsChartYTitle: string;
    settingsChartTitleFontSize: string;
    settingsChartAxisTitleFontSize: string;
    settingsChartTitleBold: string;
    settingsChartTitleItalic: string;
    settingsChartAxisTitleBold: string;
    settingsChartAxisTitleItalic: string;
    settingsChartAxisLabelMaxFontSize: string;
    settingsChartYTitlePosition: string;
    settingsChartXTitlePosition: string;
    settingsChartYTitlePositionLeft: string;
    settingsChartYTitlePositionRight: string;
    settingsChartXTitlePositionTop: string;
    settingsChartXTitlePositionBottom: string;
    settingsChartShowAxisLine: string;
    settingsChartAxisStrokeWidth: string;
    settingsChartAxisBoxStyle: string;
    settingsChartAxisBoxStyleFull: string;
    settingsChartAxisBoxStyleHalf: string;
    settingsChartAxisBoxStyleNone: string;
    settingsChartAxisStrokeStyle: string;
    settingsChartAxisStrokeStyleSolid: string;
    settingsChartAxisStrokeStyleDashed: string;
    settingsChartAxisStrokeStyleDotted: string;
    settingsChartAxisStrokeStyleDashdot: string;
    settingsChartAxisTickStyle: string;
    settingsChartAxisTickStyleInsideFull: string;
    settingsChartAxisTickStyleInsideHalf: string;
    settingsChartAxisTickStyleOutsideFull: string;
    settingsChartAxisTickStyleOutsideHalf: string;
    settingsChartShowAxisLabels: string;
    settingsChartShowGrid: string;
    settingsChartGridStrokeWidth: string;
    settingsChartGridColor: string;
    settingsChartGridStrokeStyle: string;
    settingsChartAxisColor: string;
    settingsChartTickColor: string;
    settingsChartShowLegend: string;
    settingsChartLegendMaxColumns: string;
    settingsChartLegendPosition: string;
    settingsChartLegendInside: string;
    settingsChartLegendPositionInside: string;
    settingsChartLegendMaxLength: string;
    settingsChartLegendWidth: string;
    settingsChartLegendHeight: string;
    settingsChartLegendOffsetX: string;
    settingsChartLegendOffsetY: string;
    settingsChartSwapXY: string;
    settingsChartLegendFontSize: string;
    settingsChartLegendTop: string;
    settingsChartLegendBottom: string;
    settingsChartLegendLeft: string;
    settingsChartLegendRight: string;
    settingsChartLegendTopLeft: string;
    settingsChartLegendTopRight: string;
    settingsChartLegendBottomLeft: string;
    settingsChartLegendBottomRight: string;
    settingsChartAxisPaddingLeft: string;
    settingsChartAxisPaddingRight: string;
    settingsChartAxisPaddingTop: string;
    settingsChartAxisPaddingBottom: string;
    settingsChartAxisTickLength: string;
    settingsChartAxisLabelDecimals: string;
    settingsChartExportScale: string;
    settingsChartGridLineCount: string;
    settingsChartLegendItemSpacing: string;
    settingsChartShowDataLabels: string;
    settingsChartLabelMaxLength: string;
    settingsChartDataLabelFontSize: string;
    settingsChartDataLabelDecimals: string;
    settingsChartBarCornerRadius: string;
    settingsChartBarStrokeWidth: string;
    settingsChartBarMinHeight: string;
    settingsChartBarMinWidth: string;
    settingsChartLineSmooth: string;
    settingsChartLineShowPoints: string;
    settingsChartLinePointRadius: string;
    settingsChartScatterStrokeWidth: string;
    settingsChartScatterOpacity: string;
    settingsChartPieInnerRadius: string;
    settingsChartPieLabelPosition: string;
    settingsChartPieStartAngle: string;
    settingsChartPieLabelMaxLength: string;
    settingsChartPieLabelOutside: string;
    settingsChartPieLabelInside: string;
    settingsChartPieLabelNone: string;
    settingsChartGridOpacity: string;
    settingsChartLegendSymbolSize: string;
    settingsChartAxisTickCount: string;
    settingsChartShowAxisTicks: string;
    settingsChartAxisLabelBold: string;
    settingsChartAxisLabelItalic: string;
    settingsChartDataLabelBold: string;
    settingsChartDataLabelItalic: string;
    settingsChartDataLabelPosition: string;
    settingsChartDataLabelPositionTop: string;
    settingsChartDataLabelPositionBottom: string;
    settingsChartDataLabelPositionAuto: string;
    settingsChartDataLabelOffsetX: string;
    settingsChartDataLabelOffsetY: string;
    settingsChartLegendBold: string;
    settingsChartLegendItalic: string;
    // Export settings
    settingsSectionExport: string;
    settingsExportFormat: string;
    settingsExportFormatSvg: string;
    settingsExportFormatPng: string;
    settingsExportFormatJpg: string;
    settingsExportFormatWebp: string;
    settingsExportFormatPdf: string;
    settingsExportImageDpi: string;
    settingsExportImageQuality: string;
    settingsExportBackgroundColor: string;
    settingsExportBackgroundColorWhite: string;
    settingsExportBackgroundColorNone: string;
    settingsExportBackgroundColorCustom: string;
    settingsExportBackgroundColorValue: string;
    settingsExportWidth: string;
    settingsExportHeight: string;
    settingsExportPadding: string;
    // DataPanel labels
    dataPanelShowSeries: string;
    dataPanelHideSeries: string;
    dataPanelExpandStyle: string;
    dataPanelCollapseStyle: string;
    dataPanelColor: string;
    dataPanelFillStyle: string;
    dataPanelEdgeStyle: string;
    dataPanelEdgeWidth: string;
  dataPanelOpacity: string;
  dataPanelBarBase: string;
  dataPanelLineStyle: string;
    dataPanelLineWidth: string;
    dataPanelFit: string;
    dataPanelFitType: string;
    dataPanelFitTypeLinear: string;
    dataPanelFitTypePolynomial: string;
    dataPanelFitTypeExponential: string;
    dataPanelFitTypeLogarithmic: string;
    dataPanelFitTypePower: string;
    dataPanelFitTypeMovingAverage: string;
    dataPanelPolynomialDegree: string;
    dataPanelWindowSize: string;
    dataPanelShowMarkers: string;
    dataPanelMarkerStyle: string;
    dataPanelMarkerSize: string;
    dataPanelMarkerFill: string;
    dataPanelMarkerEdge: string;
    dataPanelFillColor: string;
    dataPanelEdgeColor: string;
    dataPanelShowDataLabels: string;
    dataPanelDataLabelFontSize: string;
    dataPanelDataLabelDecimals: string;
    dataPanelDataLabelPosition: string;
    dataPanelDataLabelPositionTop: string;
    dataPanelDataLabelPositionBottom: string;
    dataPanelDataLabelPositionAuto: string;
    dataPanelDataLabelOffsetX: string;
    dataPanelDataLabelOffsetY: string;
    dataPanelDataLabelBold: string;
    dataPanelDataLabelItalic: string;
    dataPanelYAxis: string;
    dataPanelYAxisWithIndex: string;
    // Style options
    styleSolid: string;
    styleGradient: string;
    styleHatched: string;
    styleHatchedH: string;
    styleHatchedV: string;
    styleHatchedCross: string;
    styleStripes: string;
    stylePattern: string;
    styleDashed: string;
    styleDotted: string;
    styleDashdot: string;
    styleDoubleDash: string;
    styleNone: string;
    styleNoneBorder: string;
    styleNoneMarker: string;
    styleCircle: string;
    styleSquare: string;
    styleDiamond: string;
    styleStar: string;
    styleCross: string;
    stylePlus: string;
    styleX: string;
    styleTriangle: string;
    settingsFontSystem: string;
    settingsFontSans: string;
    settingsFontMono: string;
    settingsFontCustom: string;
    settingsNodeShadow: string;
    settingsTensorShadow: string;
    settingsColorTensorRole: string;
    colorTensorInput: string;
    colorTensorOutput: string;
    colorTensorWeight: string;
    colorTensorActivation: string;
    detailAttrs: string;
    settingsLayout: string;
    settingsLayoutLR: string;
    settingsLayoutTB: string;
    settingsFont: string;
    settingsFontSize: string;
    settingsNodeSize: string;
    settingsNodeGap: string;
    settingsRankGap: string;
    settingsLang: string;
    settingsLangZh: string;
    settingsLangEn: string;
    settingsGeneral: string;
    settingsColors: string;
    settingsColorUi: string;
    settingsColorGraph: string;
    settingsColorChart: string;
    settingsApplyPreset: string;
    colorBg: string;
    colorBgTarget: string;
    colorBgSidebar: string;
    colorBorder: string;
    colorText: string;
    colorText2: string;
    colorAccent: string;
    colorToolbarBg: string;
    colorToolbarHover: string;
    colorNodeFill: string;
    colorNodeStroke: string;
    colorNodeTextColor: string;
    colorNodeAttrFill: string;
    colorTensorFill: string;
    colorTensorStroke: string;
    colorEdgeStroke: string;
    errorRender: string;
    errorStart: string;
  }
> = {
  zh: {
    appTitle: 'xovis',
    pwaInstallPrompt: '安装应用',
    pwaInstallDismiss: '暂不',
    navGraph: '计算图',
    navSettings: '设置',
    navData: '数据',
    dataTitle: '数据',
    dataClose: '关闭数据',
    viewGraph: '计算图',
    viewBar: '柱状图',
    viewPie: '扇形图',
    viewLine: '折线图',
    viewScatter: '散点图',
    dataTabTable: '表格',
    dataTabView: '视图',
    tableIndex: '序号',
    tableId: 'ID',
    tableName: '名称',
    tableColumnSelectHint: '勾选列参与图表映射；主键（序号、ID）必选。',
    chartXAxis: 'X 轴',
    chartYAxis: 'Y 轴',
    chartSeriesAxis: '分组',
    chartSeriesNone: '不分组',
    chartDataMapping: '数据映射',
    chartDataMappingIntro: '先选 X 轴列（分类），再为 Y 轴添加一列或多列（数值）。',
    chartYColumnsLabel: 'Y 轴列（可多列）',
    chartAddYColumn: '添加 Y 列',
    chartAddYColumnHint: '点击可增加多个数值系列，图表将显示多组柱/多条线等。',
    chartSelectColumnsHint: '选择 X 列并添加至少一个 Y 列',
    chartRemove: '移除',
    chartAxesSection: '坐标轴',
    chartDisplaySection: '显示',
    loadSelectFile: '选择文件',
    loadImportFile: '导入文件',
    loadLoading: '加载中…',
    loadExample: '示例',
    loadError: '加载失败',
    loadDropHint: '松开以加载',
    tabUntitled: '未命名',
    graphEmpty: '上传数据',
    graphEmptySub: '',
    exportSvg: '导出 SVG',
    exportImage: '导出',
    viewReset: '还原视图',
    detailTitle: '详情',
    detailClose: '关闭详情',
    detailEmptyHint: '请上传文件显示详细信息',
    detailNode: '节点',
    detailEdge: '边',
    detailId: 'ID',
    detailName: '名称',
    detailRole: '角色',
    detailShape: '形状',
    detailDtype: '数据类型',
    detailOperatorId: '算子 ID',
    detailSource: '源',
    detailTarget: '目标',
    detailMetadata: '元数据',
    detailGraph: '图',
    detailOperators: '算子数',
    detailTensors: '张量数',
    detailInputs: '输入',
    detailOutputs: '输出',
    settingsTitle: '设置',
    settingsTheme: '主题',
    settingsThemeMode: '浅/深',
    settingsThemeLight: '浅色',
    settingsThemeDark: '深色',
    settingsThemePreset: '预设',
    settingsSilentMode: '静默',
    settingsSilentOff: '关',
    settingsSilentOn: '开',
    settingsPreset: '预设',
    settingsPresetLight1: 'Slate',
    settingsPresetLight2: 'Neutral',
    settingsPresetLight3: 'Paper',
    settingsPresetLight4: 'Cool',
    settingsPresetLight5: 'Cloud',
    settingsPresetLight6: 'Soft',
    settingsPresetDark1: 'Zinc',
    settingsPresetDark2: 'Neutral Dark',
    settingsPresetDark3: 'Nord',
    settingsPresetDark4: 'One Dark',
    settingsPresetDark5: 'Stone',
    settingsPresetDark6: 'Slate Dark',
    settingsTabPreset: '预设',
    settingsTabLayout: '布局',
    settingsTabLines: '线条',
    settingsTabColors: '色彩',
    settingsEdgeWidth: '边粗细',
    settingsEdgeCurvature: '边弧度',
    settingsNodeCornerRadius: '节点圆角',
    settingsNodeStrokeWidth: '节点框粗细',
    settingsNodeTextColor: '节点文字',
    settingsEdgeLabelShape: '边显形状',
    settingsNodeLabelAttrs: '点显属性',
    settingsShowWeightNodes: '显示权重',
    settingsShowIONodes: '显示IO',
    settingsNodeNameBold: '名字粗体',
    settingsNodeNameItalic: '名字斜体',
    settingsNodeAttrBold: '属性粗体',
    settingsNodeAttrItalic: '属性斜体',
    settingsSectionText: '文字',
    settingsSectionUi: '界面',
    settingsSectionLayout: '图·布局',
    settingsSectionLines: '图·线条',
    settingsSectionChart: '图表',
    settingsSectionChartSize: '图表·尺寸与边距',
    settingsSectionChartTitles: '图表·标题与文字',
    settingsSectionChartAxis: '图表·坐标轴',
    settingsSectionChartGrid: '图表·网格',
    settingsSectionChartLegend: '图表·图例',
    settingsSectionChartBar: '图表·柱状图',
    settingsSectionChartLine: '图表·折线图',
    settingsSectionChartScatter: '图表·散点图',
    settingsSectionChartPie: '图表·扇形图',
    settingsSectionChartDataLabels: '图表·数据标签',
    settingsChartSeriesKey: '分组列（多系列）',
    settingsChartWidth: '画布宽度',
    settingsChartHeight: '画布高度',
    settingsChartSize: '画布尺寸',
    settingsChartAxisPaddingLeft: '左边界距离',
    settingsChartAxisPaddingRight: '右边界距离',
    settingsChartAxisPaddingTop: '上边界距离',
    settingsChartAxisPaddingBottom: '下边界距离',
    settingsChartAxisLabelDecimals: '轴刻度小数位',
    settingsChartExportScale: '导出缩放',
    settingsChartBarGap: '柱间距',
    settingsChartBarGapInner: '组内间距',
    settingsChartBarGapOuter: '组外间距',
    settingsChartLineWidth: '折线粗细',
    settingsChartScatterRadius: '散点半径',
    settingsChartLabelFontSize: '标签字号',
    settingsChartPieStroke: '扇形描边',
    settingsChartPadding: '内边距',
    settingsChartTitle: '图表标题',
    settingsChartXTitle: 'X 轴标题',
    settingsChartYTitle: 'Y 轴标题',
    settingsChartTitleFontSize: '标题字号',
    settingsChartAxisTitleFontSize: '轴标题字号',
    settingsChartTitleBold: '标题加粗',
    settingsChartTitleItalic: '标题斜体',
    settingsChartAxisTitleBold: '小标题加粗',
    settingsChartAxisTitleItalic: '小标题斜体',
    settingsChartAxisLabelMaxFontSize: '轴刻度标签最大字号',
    settingsChartYTitlePosition: 'Y 轴小标题位置',
    settingsChartXTitlePosition: 'X 轴小标题位置',
    settingsChartYTitlePositionLeft: '左侧',
    settingsChartYTitlePositionRight: '右侧',
    settingsChartXTitlePositionTop: '上方',
    settingsChartXTitlePositionBottom: '下方',
    settingsChartShowAxisLine: '坐标轴线',
    settingsChartAxisStrokeWidth: '轴线宽',
    settingsChartShowAxisLabels: '轴标签',
    settingsChartShowGrid: '网格线',
    settingsChartGridStrokeWidth: '网格线宽',
    settingsChartGridColor: '网格线颜色',
    settingsChartGridStrokeStyle: '网格线样式',
    settingsChartAxisColor: '坐标轴颜色',
    settingsChartTickColor: '刻度颜色',
    settingsChartShowLegend: '图例',
    settingsChartLegendMaxColumns: '图例一行最大列数',
    settingsChartLegendPosition: '图例位置',
    settingsChartLegendInside: '图例内外',
    settingsChartLegendPositionInside: '图例内部位置',
    settingsChartLegendMaxLength: '图例名称最大长度',
    settingsChartLegendWidth: '图例区域宽（0=自动）',
    settingsChartLegendHeight: '图例区域高（0=自动）',
    settingsChartLegendOffsetX: '图例 X 偏移',
    settingsChartLegendOffsetY: '图例 Y 偏移',
    settingsChartSwapXY: '交换 X/Y',
    settingsChartLegendFontSize: '图例字号',
    settingsChartAxisBoxStyle: '坐标轴样式',
    settingsChartAxisBoxStyleFull: '全包',
    settingsChartAxisBoxStyleHalf: '半包',
    settingsChartAxisBoxStyleNone: '无',
    settingsChartAxisStrokeStyle: '坐标轴线样式',
    settingsChartAxisStrokeStyleSolid: '实线',
    settingsChartAxisStrokeStyleDashed: '虚线',
    settingsChartAxisStrokeStyleDotted: '点线',
    settingsChartAxisStrokeStyleDashdot: '点划线',
    settingsChartAxisTickStyle: '刻度样式',
    settingsChartAxisTickStyleInsideFull: '内全包',
    settingsChartAxisTickStyleInsideHalf: '内半包',
    settingsChartAxisTickStyleOutsideFull: '外全包',
    settingsChartAxisTickStyleOutsideHalf: '外半包',
    settingsChartLegendTop: '上',
    settingsChartLegendBottom: '下',
    settingsChartLegendLeft: '左',
    settingsChartLegendRight: '右',
    settingsChartLegendTopLeft: '左上',
    settingsChartLegendTopRight: '右上',
    settingsChartLegendBottomLeft: '左下',
    settingsChartLegendBottomRight: '右下',
    settingsChartAxisTickLength: '刻度线长',
    settingsChartGridLineCount: '网格线数',
    settingsChartLegendItemSpacing: '图例间距',
    settingsChartShowDataLabels: '显示数值',
    settingsChartLabelMaxLength: '标签最大字数',
    settingsChartDataLabelFontSize: '数据标签字号',
    settingsChartDataLabelDecimals: '数值小数位',
    settingsChartBarCornerRadius: '柱圆角',
    settingsChartBarStrokeWidth: '柱描边宽',
    settingsChartBarMinHeight: '最小柱高',
    settingsChartBarMinWidth: '最小柱宽（0=防重叠）',
    settingsChartLineSmooth: '折线平滑',
    settingsChartLineShowPoints: '显示数据点',
    settingsChartLinePointRadius: '数据点半径',
    settingsChartScatterStrokeWidth: '散点描边宽',
    settingsChartScatterOpacity: '散点不透明度',
    settingsChartPieInnerRadius: '扇形内径',
    settingsChartPieLabelPosition: '标签位置',
    settingsChartPieStartAngle: '起始角度',
    settingsChartPieLabelMaxLength: '标签最大字数',
    settingsChartPieLabelOutside: '外侧',
    settingsChartPieLabelInside: '内侧',
    settingsChartPieLabelNone: '不显示',
    settingsChartGridOpacity: '网格不透明度',
    settingsChartLegendSymbolSize: '图例符号大小',
    settingsChartAxisTickCount: '轴刻度数量',
    settingsChartShowAxisTicks: '显示刻度线',
    settingsChartAxisLabelBold: '坐标轴标签加粗',
    settingsChartAxisLabelItalic: '坐标轴标签斜体',
    settingsChartDataLabelBold: '数据标签加粗',
    settingsChartDataLabelItalic: '数据标签斜体',
    settingsChartDataLabelPosition: '数据标签位置',
    settingsChartDataLabelPositionTop: '上',
    settingsChartDataLabelPositionBottom: '下',
    settingsChartDataLabelPositionAuto: '自适应',
    settingsChartDataLabelOffsetX: '数据标签 X 偏移',
    settingsChartDataLabelOffsetY: '数据标签 Y 偏移',
    settingsChartLegendBold: '图例加粗',
    settingsChartLegendItalic: '图例斜体',
    // Export settings
    settingsSectionExport: '导出',
    settingsExportFormat: '文件格式',
    settingsExportFormatSvg: 'SVG',
    settingsExportFormatPng: 'PNG',
    settingsExportFormatJpg: 'JPG',
    settingsExportFormatWebp: 'WebP',
    settingsExportFormatPdf: 'PDF',
    settingsExportImageDpi: '分辨率 (DPI)',
    settingsExportImageQuality: '质量',
    settingsExportBackgroundColor: '背景色',
    settingsExportBackgroundColorWhite: '白色',
    settingsExportBackgroundColorNone: '透明',
    settingsExportBackgroundColorCustom: '自定义',
    settingsExportBackgroundColorValue: '自定义颜色',
    settingsExportWidth: '宽度',
    settingsExportHeight: '高度',
    settingsExportPadding: '边距',
    // DataPanel labels
    dataPanelShowSeries: '显示系列',
    dataPanelHideSeries: '隐藏系列',
    dataPanelExpandStyle: '展开样式',
    dataPanelCollapseStyle: '收起样式',
    dataPanelColor: '颜色',
    dataPanelFillStyle: '填充样式',
    dataPanelEdgeStyle: '边框样式',
    dataPanelEdgeWidth: '边框宽度',
    dataPanelOpacity: '透明度',
    dataPanelBarBase: '起始数据',
    dataPanelLineStyle: '线型',
    dataPanelLineWidth: '线宽',
    dataPanelFit: '拟合',
    dataPanelFitType: '拟合类型',
    dataPanelFitTypeLinear: '线性拟合',
    dataPanelFitTypePolynomial: '多项式拟合',
    dataPanelFitTypeExponential: '指数拟合',
    dataPanelFitTypeLogarithmic: '对数拟合',
    dataPanelFitTypePower: '幂函数拟合',
    dataPanelFitTypeMovingAverage: '移动平均',
    dataPanelPolynomialDegree: '多项式阶数',
    dataPanelWindowSize: '窗口大小',
    dataPanelShowMarkers: '显示标记',
    dataPanelMarkerStyle: '标记样式',
    dataPanelMarkerSize: '标记大小',
    dataPanelMarkerFill: '标记填充',
    dataPanelMarkerEdge: '标记边框',
    dataPanelFillColor: '填充颜色',
    dataPanelEdgeColor: '边框颜色',
    dataPanelShowDataLabels: '显示数值',
    dataPanelDataLabelFontSize: '字体大小',
    dataPanelDataLabelDecimals: '小数位数',
    dataPanelDataLabelPosition: '位置',
    dataPanelDataLabelPositionTop: '上方',
    dataPanelDataLabelPositionBottom: '下方',
    dataPanelDataLabelPositionAuto: '自动',
    dataPanelDataLabelOffsetX: 'X偏移',
    dataPanelDataLabelOffsetY: 'Y偏移',
    dataPanelDataLabelBold: '加粗',
    dataPanelDataLabelItalic: '斜体',
    dataPanelYAxis: 'Y轴',
    dataPanelYAxisWithIndex: 'Y轴 {index}',
    // Style options
    styleSolid: '实线',
    styleGradient: '渐变',
    styleHatched: '斜线',
    styleHatchedH: '横线',
    styleHatchedV: '竖线',
    styleHatchedCross: '交叉',
    styleStripes: '条纹',
    stylePattern: '圆点',
    styleDashed: '虚线',
    styleDotted: '点线',
    styleDashdot: '点划线',
    styleDoubleDash: '双虚线',
    styleNone: '无',
    styleNoneBorder: '无边框',
    styleNoneMarker: '无标记',
    styleCircle: '圆形',
    styleSquare: '方形',
    styleDiamond: '菱形',
    styleStar: '星形',
    styleCross: '十字',
    stylePlus: '加号',
    styleX: 'X形',
    styleTriangle: '三角形',
    settingsFontSystem: '系统默认',
    settingsFontSans: '无衬线',
    settingsFontMono: '等宽',
    settingsFontCustom: '自定义',
    settingsNodeShadow: '图阴影',
    settingsTensorShadow: '张量阴影',
    settingsColorTensorRole: '张量角色',
    colorTensorInput: '输入',
    colorTensorOutput: '输出',
    colorTensorWeight: '权重',
    colorTensorActivation: '激活',
    detailAttrs: '属性',
    settingsLayout: '布局方向',
    settingsLayoutLR: '左右',
    settingsLayoutTB: '上下',
    settingsFont: '字体',
    settingsFontSize: '字号',
    settingsNodeSize: '节点尺寸',
    settingsNodeGap: '节点间距',
    settingsRankGap: '层级间距',
    settingsLang: '语言',
    settingsLangZh: '中文',
    settingsLangEn: 'English',
    settingsGeneral: '常规',
    settingsColors: '色彩',
    settingsColorUi: '界面',
    settingsColorGraph: '图',
    settingsColorChart: '图表',
    settingsApplyPreset: '应用预设',
    colorBg: '背景',
    colorBgTarget: '画布',
    colorBgSidebar: '侧栏',
    colorBorder: '边框',
    colorText: '文字',
    colorText2: '次要文字',
    colorAccent: '强调',
    colorToolbarBg: '工具栏',
    colorToolbarHover: '工具栏悬停',
    colorNodeFill: '节点填充',
    colorNodeStroke: '节点描边',
    colorNodeTextColor: '节点文字',
    colorNodeAttrFill: '点显属性背景',
    colorTensorFill: '张量填充',
    colorTensorStroke: '张量描边',
    colorEdgeStroke: '边',
    errorRender: '渲染出错',
    errorStart: '启动失败',
  },
  en: {
    appTitle: 'xovis',
    pwaInstallPrompt: 'Install app',
    pwaInstallDismiss: 'Not now',
    navGraph: 'Graph',
    navSettings: 'Settings',
    navData: 'Data',
    dataTitle: 'Data',
    dataClose: 'Close data',
    viewGraph: 'Graph',
    viewBar: 'Bar',
    viewPie: 'Pie',
    viewLine: 'Line',
    viewScatter: 'Scatter',
    dataTabTable: 'Table',
    dataTabView: 'View',
    tableIndex: '#',
    tableId: 'ID',
    tableName: 'Name',
    tableColumnSelectHint: 'Check columns to use in chart mapping; primary key always selected.',
    chartXAxis: 'X axis',
    chartYAxis: 'Y axis',
    chartSeriesAxis: 'Series',
    chartSeriesNone: 'None',
    chartDataMapping: 'Data mapping',
    chartDataMappingIntro: 'Select X axis column, then add one or more Y axis columns.',
    chartYColumnsLabel: 'Y axis columns',
    chartAddYColumn: 'Add Y column',
    chartAddYColumnHint: 'Click to add more value series; chart will show multiple bars/lines etc.',
    chartSelectColumnsHint: 'Select X column and add at least one Y column',
    chartRemove: 'Remove',
    chartAxesSection: 'Axes',
    chartDisplaySection: 'Display',
    loadSelectFile: 'Select file',
    loadImportFile: 'Import file',
    loadLoading: 'Loading…',
    loadExample: 'Example',
    loadError: 'Load failed',
    loadDropHint: 'Release to load',
    tabUntitled: 'Untitled',
    graphEmpty: 'Upload data',
    graphEmptySub: '',
    exportSvg: 'Export SVG',
    exportImage: 'Export',
    viewReset: 'Reset view',
    detailTitle: 'Detail',
    detailClose: 'Close detail',
    detailEmptyHint: 'Please upload a file to show details',
    detailNode: 'Node',
    detailEdge: 'Edge',
    detailId: 'ID',
    detailName: 'Name',
    detailRole: 'Role',
    detailShape: 'Shape',
    detailDtype: 'Dtype',
    detailOperatorId: 'Operator ID',
    detailSource: 'Source',
    detailTarget: 'Target',
    detailMetadata: 'Metadata',
    detailGraph: 'Graph',
    detailOperators: 'Operators',
    detailTensors: 'Tensors',
    detailInputs: '输入',
    detailOutputs: '输出',
    settingsTitle: 'Settings',
    settingsTheme: 'Theme',
    settingsThemeMode: 'Light/Dark',
    settingsThemeLight: 'Light',
    settingsThemeDark: 'Dark',
    settingsThemePreset: 'Preset',
    settingsSilentMode: 'Silent',
    settingsSilentOff: 'Off',
    settingsSilentOn: 'On',
    settingsPreset: 'Preset',
    settingsPresetLight1: 'Slate',
    settingsPresetLight2: 'Neutral',
    settingsPresetLight3: 'Paper',
    settingsPresetLight4: 'Cool',
    settingsPresetLight5: 'Cloud',
    settingsPresetLight6: 'Soft',
    settingsPresetDark1: 'Zinc',
    settingsPresetDark2: 'Neutral Dark',
    settingsPresetDark3: 'Nord',
    settingsPresetDark4: 'One Dark',
    settingsPresetDark5: 'Stone',
    settingsPresetDark6: 'Slate Dark',
    settingsTabPreset: 'Preset',
    settingsTabLayout: 'Layout',
    settingsTabLines: 'Lines',
    settingsTabColors: 'Colors',
    settingsEdgeWidth: 'Edge width',
    settingsEdgeCurvature: 'Edge curvature',
    settingsNodeCornerRadius: 'Node corner radius',
    settingsNodeStrokeWidth: 'Node stroke',
    settingsNodeTextColor: 'Node text',
    settingsEdgeLabelShape: 'Shape on edge',
    settingsNodeLabelAttrs: 'Node attributes',
    settingsShowWeightNodes: 'Show weights',
    settingsShowIONodes: 'Show IO',
    settingsNodeNameBold: 'Name bold',
    settingsNodeNameItalic: 'Name italic',
    settingsNodeAttrBold: 'Attr bold',
    settingsNodeAttrItalic: 'Attr italic',
    settingsSectionText: 'Text',
    settingsSectionUi: 'UI',
    settingsSectionLayout: 'Graph layout',
    settingsSectionLines: 'Graph lines',
    settingsSectionChart: 'Charts',
    settingsSectionChartSize: 'Chart size & padding',
    settingsSectionChartTitles: 'Chart titles & text',
    settingsSectionChartAxis: 'Chart axis',
    settingsSectionChartGrid: 'Chart grid',
    settingsSectionChartLegend: 'Chart legend',
    settingsSectionChartBar: 'Chart · Bar',
    settingsSectionChartLine: 'Chart · Line',
    settingsSectionChartScatter: 'Chart · Scatter',
    settingsSectionChartPie: 'Chart · Pie',
    settingsSectionChartDataLabels: 'Data labels',
    settingsChartSeriesKey: 'Series key',
    settingsChartWidth: 'Canvas width',
    settingsChartHeight: 'Canvas height',
    settingsChartSize: 'Canvas size',
    settingsChartAxisPaddingLeft: 'Left padding',
    settingsChartAxisPaddingRight: 'Right padding',
    settingsChartAxisPaddingTop: 'Top padding',
    settingsChartAxisPaddingBottom: 'Bottom padding',
    settingsChartAxisLabelDecimals: 'Axis tick decimals',
    settingsChartExportScale: 'Export scale',
    settingsChartBarGap: 'Bar gap',
    settingsChartBarGapInner: 'Inner gap',
    settingsChartBarGapOuter: 'Outer gap',
    settingsChartLineWidth: 'Line width',
    settingsChartScatterRadius: 'Scatter radius',
    settingsChartLabelFontSize: 'Label font size',
    settingsChartPieStroke: 'Pie stroke',
    settingsChartPadding: 'Padding',
    settingsChartTitle: 'Chart title',
    settingsChartXTitle: 'X axis title',
    settingsChartYTitle: 'Y axis title',
    settingsChartTitleFontSize: 'Title font size',
    settingsChartAxisTitleFontSize: 'Axis title font size',
    settingsChartTitleBold: 'Title bold',
    settingsChartTitleItalic: 'Title italic',
    settingsChartAxisTitleBold: 'Axis title bold',
    settingsChartAxisTitleItalic: 'Axis title italic',
    settingsChartAxisLabelMaxFontSize: 'Axis label max font size',
    settingsChartYTitlePosition: 'Y axis title position',
    settingsChartXTitlePosition: 'X axis title position',
    settingsChartYTitlePositionLeft: 'Left',
    settingsChartYTitlePositionRight: 'Right',
    settingsChartXTitlePositionTop: 'Top',
    settingsChartXTitlePositionBottom: 'Bottom',
    settingsChartShowAxisLine: 'Axis line',
    settingsChartAxisStrokeWidth: 'Axis stroke width',
    settingsChartShowAxisLabels: 'Axis labels',
    settingsChartShowGrid: 'Grid',
    settingsChartGridStrokeWidth: 'Grid stroke width',
    settingsChartGridColor: 'Grid color',
    settingsChartGridStrokeStyle: 'Grid style',
    settingsChartAxisColor: 'Axis color',
    settingsChartTickColor: 'Tick color',
    settingsChartShowLegend: 'Legend',
    settingsChartLegendMaxColumns: 'Legend max columns per row',
    settingsChartLegendPosition: 'Legend position',
    settingsChartLegendInside: 'Legend inside/outside',
    settingsChartLegendPositionInside: 'Legend position',
    settingsChartLegendMaxLength: 'Legend name max length',
    settingsChartLegendWidth: 'Legend width',
    settingsChartLegendHeight: 'Legend height',
    settingsChartLegendOffsetX: 'Legend X offset',
    settingsChartLegendOffsetY: 'Legend Y offset',
    settingsChartSwapXY: 'Swap X/Y',
    settingsChartLegendFontSize: 'Legend font size',
    settingsChartAxisBoxStyle: 'Axis box style',
    settingsChartAxisBoxStyleFull: 'Full box',
    settingsChartAxisBoxStyleHalf: 'Half box',
    settingsChartAxisBoxStyleNone: 'None',
    settingsChartAxisStrokeStyle: 'Axis line style',
    settingsChartAxisStrokeStyleSolid: 'Solid',
    settingsChartAxisStrokeStyleDashed: 'Dashed',
    settingsChartAxisStrokeStyleDotted: 'Dotted',
    settingsChartAxisStrokeStyleDashdot: 'Dash-dot',
    settingsChartAxisTickStyle: 'Tick style',
    settingsChartAxisTickStyleInsideFull: 'Inside full',
    settingsChartAxisTickStyleInsideHalf: 'Inside half',
    settingsChartAxisTickStyleOutsideFull: 'Outside full',
    settingsChartAxisTickStyleOutsideHalf: 'Outside half',
    settingsChartLegendTop: 'Top',
    settingsChartLegendBottom: 'Bottom',
    settingsChartLegendLeft: 'Left',
    settingsChartLegendRight: 'Right',
    settingsChartLegendTopLeft: 'Top-left',
    settingsChartLegendTopRight: 'Top-right',
    settingsChartLegendBottomLeft: 'Bottom-left',
    settingsChartLegendBottomRight: 'Bottom-right',
    settingsChartAxisTickLength: 'Tick length',
    settingsChartGridLineCount: 'Grid lines',
    settingsChartLegendItemSpacing: 'Legend spacing',
    settingsChartShowDataLabels: 'Show values',
    settingsChartLabelMaxLength: 'Label max length',
    settingsChartDataLabelFontSize: 'Data label font size',
    settingsChartDataLabelDecimals: 'Value decimals',
    settingsChartBarCornerRadius: 'Bar corner radius',
    settingsChartBarStrokeWidth: 'Bar stroke width',
    settingsChartBarMinHeight: 'Bar min height',
    settingsChartBarMinWidth: 'Bar min width',
    settingsChartLineSmooth: 'Line smooth',
    settingsChartLineShowPoints: 'Show data points',
    settingsChartLinePointRadius: 'Point radius',
    settingsChartScatterStrokeWidth: 'Scatter stroke width',
    settingsChartScatterOpacity: 'Scatter opacity',
    settingsChartPieInnerRadius: 'Pie inner radius',
    settingsChartPieLabelPosition: 'Label position',
    settingsChartPieStartAngle: 'Start angle',
    settingsChartPieLabelMaxLength: 'Label max length',
    settingsChartPieLabelOutside: 'Outside',
    settingsChartPieLabelInside: 'Inside',
    settingsChartPieLabelNone: 'None',
    settingsChartGridOpacity: 'Grid opacity',
    settingsChartLegendSymbolSize: 'Legend symbol size',
    settingsChartAxisTickCount: 'Axis tick count',
    settingsChartShowAxisTicks: 'Show axis ticks',
    settingsChartAxisLabelBold: 'Axis labels bold',
    settingsChartAxisLabelItalic: 'Axis labels italic',
    settingsChartDataLabelBold: 'Data labels bold',
    settingsChartDataLabelItalic: 'Data labels italic',
    settingsChartDataLabelPosition: 'Data label position',
    settingsChartDataLabelPositionTop: 'Top',
    settingsChartDataLabelPositionBottom: 'Bottom',
    settingsChartDataLabelPositionAuto: 'Auto',
    settingsChartDataLabelOffsetX: 'Data label X offset',
    settingsChartDataLabelOffsetY: 'Data label Y offset',
    settingsChartLegendBold: 'Legend bold',
    settingsChartLegendItalic: 'Legend italic',
    // Export settings
    settingsSectionExport: 'Export',
    settingsExportFormat: 'File format',
    settingsExportFormatSvg: 'SVG',
    settingsExportFormatPng: 'PNG',
    settingsExportFormatJpg: 'JPG',
    settingsExportFormatWebp: 'WebP',
    settingsExportFormatPdf: 'PDF',
    settingsExportImageDpi: 'Resolution (DPI)',
    settingsExportImageQuality: 'Quality',
    settingsExportBackgroundColor: 'Background Color',
    settingsExportBackgroundColorWhite: 'White',
    settingsExportBackgroundColorNone: 'None',
    settingsExportBackgroundColorCustom: 'Custom',
    settingsExportBackgroundColorValue: 'Custom Color',
    settingsExportWidth: 'Width',
    settingsExportHeight: 'Height',
    settingsExportPadding: 'Padding',
    // DataPanel labels
    dataPanelShowSeries: 'Show series',
    dataPanelHideSeries: 'Hide series',
    dataPanelExpandStyle: 'Expand style',
    dataPanelCollapseStyle: 'Collapse style',
    dataPanelColor: 'Color',
    dataPanelFillStyle: 'Fill style',
    dataPanelEdgeStyle: 'Edge style',
    dataPanelEdgeWidth: 'Edge width',
    dataPanelOpacity: 'Opacity',
    dataPanelBarBase: 'Base column',
    dataPanelLineStyle: 'Line style',
    dataPanelLineWidth: 'Line width',
    dataPanelFit: 'Fit',
    dataPanelFitType: 'Fit type',
    dataPanelFitTypeLinear: 'Linear fit',
    dataPanelFitTypePolynomial: 'Polynomial fit',
    dataPanelFitTypeExponential: 'Exponential fit',
    dataPanelFitTypeLogarithmic: 'Logarithmic fit',
    dataPanelFitTypePower: 'Power fit',
    dataPanelFitTypeMovingAverage: 'Moving average',
    dataPanelPolynomialDegree: 'Polynomial degree',
    dataPanelWindowSize: 'Window size',
    dataPanelShowMarkers: 'Show markers',
    dataPanelMarkerStyle: 'Marker style',
    dataPanelMarkerSize: 'Marker size',
    dataPanelMarkerFill: 'Marker fill',
    dataPanelMarkerEdge: 'Marker edge',
    dataPanelFillColor: 'Fill color',
    dataPanelEdgeColor: 'Edge color',
    dataPanelShowDataLabels: 'Show values',
    dataPanelDataLabelFontSize: 'Font size',
    dataPanelDataLabelDecimals: 'Decimals',
    dataPanelDataLabelPosition: 'Position',
    dataPanelDataLabelPositionTop: 'Top',
    dataPanelDataLabelPositionBottom: 'Bottom',
    dataPanelDataLabelPositionAuto: 'Auto',
    dataPanelDataLabelOffsetX: 'X offset',
    dataPanelDataLabelOffsetY: 'Y offset',
    dataPanelDataLabelBold: 'Bold',
    dataPanelDataLabelItalic: 'Italic',
    dataPanelYAxis: 'Y axis',
    dataPanelYAxisWithIndex: 'Y axis {index}',
    // Style options
    styleSolid: 'Solid',
    styleGradient: 'Gradient',
    styleHatched: 'Hatched',
    styleHatchedH: 'Horizontal',
    styleHatchedV: 'Vertical',
    styleHatchedCross: 'Cross',
    styleStripes: 'Stripes',
    stylePattern: 'Dots',
    styleDashed: 'Dashed',
    styleDotted: 'Dotted',
    styleDashdot: 'Dash-dot',
    styleDoubleDash: 'Double dash',
    styleNone: 'None',
    styleNoneBorder: 'No border',
    styleNoneMarker: 'No marker',
    styleCircle: 'Circle',
    styleSquare: 'Square',
    styleDiamond: 'Diamond',
    styleStar: 'Star',
    styleCross: 'Cross',
    stylePlus: 'Plus',
    styleX: 'X',
    styleTriangle: 'Triangle',
    settingsFontSystem: 'System',
    settingsFontSans: 'Sans-serif',
    settingsFontMono: 'Monospace',
    settingsFontCustom: 'Custom',
    settingsNodeShadow: 'Graph shadow',
    settingsTensorShadow: 'Tensor shadow',
    settingsColorTensorRole: 'Tensor role',
    colorTensorInput: 'Input',
    colorTensorOutput: 'Output',
    colorTensorWeight: 'Weight',
    colorTensorActivation: 'Activation',
    detailAttrs: 'Attributes',
    settingsLayout: 'Layout',
    settingsLayoutLR: 'Left-Right',
    settingsLayoutTB: 'Top-Bottom',
    settingsFont: 'Font',
    settingsFontSize: 'Font size',
    settingsNodeSize: 'Node size',
    settingsNodeGap: 'Node gap',
    settingsRankGap: 'Rank gap',
    settingsLang: 'Language',
    settingsLangZh: '中文',
    settingsLangEn: 'English',
    settingsGeneral: 'General',
    settingsColors: 'Colors',
    settingsColorUi: 'UI',
    settingsColorGraph: 'Graph',
    settingsColorChart: 'Chart',
    settingsApplyPreset: 'Apply preset',
    colorBg: 'Background',
    colorBgTarget: 'Canvas',
    colorBgSidebar: 'Sidebar',
    colorBorder: 'Border',
    colorText: 'Text',
    colorText2: 'Text secondary',
    colorAccent: 'Accent',
    colorToolbarBg: 'Toolbar',
    colorToolbarHover: 'Toolbar hover',
    colorNodeFill: 'Node fill',
    colorNodeStroke: 'Node stroke',
    colorNodeTextColor: 'Node text',
    colorNodeAttrFill: 'Node attrs background',
    colorTensorFill: 'Tensor fill',
    colorTensorStroke: 'Tensor stroke',
    colorEdgeStroke: 'Edge',
    errorRender: 'Render error',
    errorStart: 'Start failed',
  },
};

export function getLocale(lang: Lang) {
  return locale[lang];
}
