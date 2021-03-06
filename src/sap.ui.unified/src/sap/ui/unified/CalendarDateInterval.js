/*!
 * ${copyright}
 */

//Provides control sap.ui.unified.Calendar.
sap.ui.define(['jquery.sap.global', 'sap/ui/core/Control', 'sap/ui/core/LocaleData', 'sap/ui/model/type/Date', 'sap/ui/unified/calendar/CalendarUtils',
		'./Calendar', './calendar/Header', './calendar/Month', './calendar/DatesRow', './calendar/MonthPicker', './calendar/YearPicker', 'sap/ui/unified/calendar/CalendarDate', './library'],
	function(jQuery, Control, LocaleData, Date1, CalendarUtils, Calendar, Header, Month, DatesRow, MonthPicker, YearPicker, CalendarDate, library) {
	"use strict";

	/*
	* Inside the CalendarDateInterval CalendarDate objects are used. But in the API JS dates are used.
	* So conversion must be done on API functions.
	*/

	/**
	 * Constructor for a new <code>CalendarDateInterval</code>.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @class
	 * Calendar with dates displayed in one line.
	 * @extends sap.ui.unified.Calendar
	 * @version ${version}
	 *
	 * @constructor
	 * @public
	 * @since 1.30.0
	 * @alias sap.ui.unified.CalendarDateInterval
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var CalendarDateInterval = Calendar.extend("sap.ui.unified.CalendarDateInterval", /** @lends sap.ui.unified.CalendarDateInterval.prototype */ { metadata : {

		library : "sap.ui.unified",
		properties : {

			/**
			 * Start date of the Interval
			 */
			startDate : {type : "object", group : "Data"},

			/**
			 * number of days displayed
			 * on phones the maximum rendered number of days is 8.
			 */
			days : {type : "int", group : "Appearance", defaultValue : 7},

			/**
			 * If set the day names are shown in a separate line.
			 * If not set the day names are shown inside the single days.
			 * @since 1.34.0
			 */
			showDayNamesLine : {type : "boolean", group : "Appearance", defaultValue : true},

			/**
			 * If set, the month- and yearPicker opens on a popup
			 * @since 1.34.0
			 */
			pickerPopup : {type : "boolean", group : "Appearance", defaultValue : false}

		},
		aggregations : {
			/**
			 * Hidden, for internal use only.
			 */
			calendar : {type : "sap.ui.unified.Calendar", multiple : false, visibility : "hidden"}

		}
	}});

	CalendarDateInterval.prototype.init = function(){

		Calendar.prototype.init.apply(this, arguments);

		var oMonthPicker = this.getAggregation("monthPicker");
		oMonthPicker.setColumns(0);
		oMonthPicker.setMonths(3); // default for 7 days
		oMonthPicker.attachEvent("pageChange", _handleMonthPickerPageChange, this);

		var oYearPicker = this.getAggregation("yearPicker");
		oYearPicker.setColumns(0);
		oYearPicker.setYears(3); // default for 7 days
		oYearPicker.attachEvent("pageChange", _handleYearPickerPageChange, this);

		this._iDaysMonthHead = 35; // if more than this number of days, month names are displayed on top of days

	};

	CalendarDateInterval.prototype.onBeforeRendering = function(){
		if (this.getPickerPopup()) {
			var oHeader = this.getAggregation("header");
			oHeader.setVisibleButton2(false);
			this._setHeaderText(this._getFocusedDate(true));
		}
	};

	/**
	 * Lazily initializes the <code>Calendar</code> aggregation.
	 * @private
	 * @returns {sap.ui.unified.Calendar} The newly created control
	 */
	CalendarDateInterval.prototype._getCalendar = function (){
		var oCalendar = this.getAggregation("calendar");

		if (!oCalendar) {
			oCalendar = new sap.ui.unified.Calendar(this.getId() + "--Cal", {});
			oCalendar.setPopupMode(true);
			oCalendar.attachEvent("select", _handleCalendarDateSelect, this);
			this.setAggregation("calendar", oCalendar);
		}
		return oCalendar;
	};

	CalendarDateInterval.prototype._handleButton1 = function(oEvent){
		if (this.getPickerPopup()) {
			this._showCalendarPicker();
		} else {
			if (this._iMode != 1) {
				this._showMonthPicker();
			} else {
				this._hideMonthPicker();
			}
		}
	};

	CalendarDateInterval.prototype._setHeaderText = function(oDate){

		// sets the text for the month and the year button to the header

		var oHeader = this.getAggregation("header");
		var oLocaleData = this._getLocaleData();
		var aMonthNames = [];
		var aMonthNamesWide = [];
		var aMonthNamesSecondary = [];
		var sAriaLabel;
		var bShort = false;
		var sMonth;
		var sYear;
		var sText;
		var sPattern;
		var sPrimaryCalendarType = this.getPrimaryCalendarType();
		var sSecondaryCalendarType = this._getSecondaryCalendarType();


		if (this._bLongMonth || !this._bNamesLengthChecked) {
			aMonthNames = oLocaleData.getMonthsStandAlone("wide", sPrimaryCalendarType);
		} else {
			bShort = true;
			aMonthNames = oLocaleData.getMonthsStandAlone("abbreviated", sPrimaryCalendarType);
			aMonthNamesWide = oLocaleData.getMonthsStandAlone("wide", sPrimaryCalendarType);
		}

		if (sSecondaryCalendarType) {
			// always use short month names because in most cases 2 months are displayed
			aMonthNamesSecondary = oLocaleData.getMonthsStandAlone("abbreviated", sSecondaryCalendarType);

			var oSecondaryMonths = this._getDisplayedSecondaryMonths(sPrimaryCalendarType, sSecondaryCalendarType);
			if (oSecondaryMonths.start == oSecondaryMonths.end) {
				sMonth = aMonthNamesSecondary[oSecondaryMonths.start];
			} else {
				sPattern = oLocaleData.getIntervalPattern();
				sMonth = sPattern.replace(/\{0\}/, aMonthNamesSecondary[oSecondaryMonths.start]).replace(/\{1\}/, aMonthNamesSecondary[oSecondaryMonths.end]);
			}
		}
		if (!this.getPickerPopup()) {
			oHeader.setAdditionalTextButton1(sMonth);
		}

		var aMonths = this._getDisplayedMonths(oDate);
		if (aMonths.length > 1 && !this._bShowOneMonth) {
			if (!sPattern) {
				sPattern = oLocaleData.getIntervalPattern();
			}
			sMonth = sPattern.replace(/\{0\}/, aMonthNames[aMonths[0]]).replace(/\{1\}/, aMonthNames[aMonths[aMonths.length - 1]]);
			if (bShort) {
				sAriaLabel = sPattern.replace(/\{0\}/, aMonthNamesWide[aMonths[0]]).replace(/\{1\}/, aMonthNamesWide[aMonths[aMonths.length - 1]]);
			}
		}else {
			sMonth = aMonthNames[aMonths[0]];
			if (bShort) {
				sAriaLabel = aMonthNamesWide[aMonths[0]];
			}
		}

		var oFirstDate = new CalendarDate(oDate, sPrimaryCalendarType);
		oFirstDate.setDate(1); // always use the first of the month to have stable year in Japanese calendar
		sYear = this._oYearFormat.format(oFirstDate.toUTCJSDate(), true);

		if (!this.getPickerPopup()) {
			oHeader.setTextButton1(sMonth);
			if (bShort) {
				oHeader.setAriaLabelButton1(sAriaLabel);
			}
			oHeader.setTextButton2(sYear);

			if (sSecondaryCalendarType) {
				oFirstDate = new CalendarDate(oFirstDate, sSecondaryCalendarType);
				oHeader.setAdditionalTextButton2(this._oYearFormatSecondary.format(oFirstDate.toUTCJSDate(), true));
			} else {
				oHeader.setAdditionalTextButton2();
			}
		} else {
			if (oLocaleData.oLocale.sLanguage.toLowerCase() === "ja" || oLocaleData.oLocale.sLanguage.toLowerCase() === "zh") {
				sText = sYear + " " + sMonth;
				sAriaLabel = sYear + sAriaLabel;
			} else {
				sText = sMonth + " " + sYear;
				sAriaLabel = sAriaLabel + sYear;
			}
			oHeader.setTextButton1(sText, true);
			if (bShort) {
				oHeader.setAriaLabelButton1(sAriaLabel);
			}
		}
	};

	CalendarDateInterval.prototype._showCalendarPicker = function() {
		var oDate = this._getFocusedDate(true).toLocalJSDate();
		var oCalendar = this._getCalendar();
		var oSelectedRange = new sap.ui.unified.DateRange();
		var oEndDate = this._getFocusedDate(true).toLocalJSDate();

		oEndDate.setDate(oEndDate.getDate() + this._getDays() - 1);
		oSelectedRange.setStartDate(oDate);
		oSelectedRange.setEndDate(oEndDate);

		oCalendar.displayDate(oDate, false);
		oCalendar.removeAllSelectedDates();
		oCalendar.addSelectedDate(oSelectedRange);

		this._openPickerPopup(oCalendar);
		this.$("contentOver").css("display", "");
	};

	function _handleCalendarDateSelect(oEvent) {
		var oCalendar = this._getCalendar();
		this._focusDateExtend.call(this, oCalendar._getFocusedDate(), true);
		this.fireStartDateChange();

		_closeCalendarPicker.call(this);
	}

	function _closeCalendarPicker() {
		if (this._oPopup && this._oPopup.isOpen()) {
			this._oPopup.close();
		}
		this.$("contentOver").css("display", "none");
	}

	/**
	* If more than this number of days are displayed, start and end month are displayed on the button.
	* @returns {int} The number of days to determine how the start and end of month are displayed
	* @protected
	*/
	CalendarDateInterval.prototype._getDaysLarge = function() {
		return 10;
	};

	CalendarDateInterval.prototype._createMonth = function(sId){

		var oMonth = new DatesRow(sId);

		return oMonth;

	};

	CalendarDateInterval.prototype.setStartDate = function(oStartDate){

		CalendarUtils._checkJSDateObject(oStartDate);

		if (jQuery.sap.equal(this.getStartDate(), oStartDate)) {
			return this;
		}

		var iYear = oStartDate.getFullYear();
		CalendarUtils._checkYearInValidRange(iYear);

		var oCalStartDate = CalendarDate.fromLocalJSDate(oStartDate, this.getPrimaryCalendarType());
		if (CalendarUtils._isOutside(oCalStartDate, this._oMinDate, this._oMaxDate)) {
			throw new Error("Date must be in valid range (minDate and maxDate); " + this);
		}

		var oMinDate = this.getMinDate();
		if (oMinDate && oStartDate.getTime() < oMinDate.getTime()) {
			jQuery.sap.log.warning("startDate < minDate -> minDate as startDate set", this);
			oStartDate = new Date(oMinDate.getTime());
		}

		var oMaxDate = this.getMaxDate();
		if (oMaxDate && oStartDate.getTime() > oMaxDate.getTime()) {
			jQuery.sap.log.warning("startDate > maxDate -> maxDate as startDate set", this);
			oStartDate = new Date(oMaxDate.getTime());
		}

		this.setProperty("startDate", oStartDate, true);
		oCalStartDate = CalendarDate.fromLocalJSDate(oStartDate, this.getPrimaryCalendarType());
		this._oStartDate = oCalStartDate;

		var oDatesRow = this.getAggregation("month")[0];
		oDatesRow.setStartDate(oStartDate);

		this._updateHeader(oCalStartDate);

		var oDate = this._getFocusedDate(true).toLocalJSDate();
		if (!oDatesRow.checkDateFocusable(oDate)) {
			//focused date not longer visible -> focus start date  (but don't set focus)
			this._setFocusedDate(oCalStartDate);
			oDatesRow.displayDate(oStartDate);
		}

		return this;

	};

	// needs to be overwritten because differently implemented in Calendar
	/**
	 * Gets current value of property startDate.
	 *
	 * Start date of the Interval
	 * @returns {object} JavaScript date object for property startDate
	 */
	CalendarDateInterval.prototype.getStartDate = function(){

		return this.getProperty("startDate");

	};

	CalendarDateInterval.prototype.setDays = function(iDays){

		this.setProperty("days", iDays, true);

		iDays = this._getDays(); // to use phone limit

		var oDatesRow = this.getAggregation("month")[0];
		oDatesRow.setDays(iDays);

		if (!this.getPickerPopup()) {
			var oMonthPicker = this.getAggregation("monthPicker");
			var iMonths = Math.ceil(iDays / 3);
			if (iMonths > 12) {
				iMonths = 12;
			}
			oMonthPicker.setMonths(iMonths);

			var oYearPicker = this.getAggregation("yearPicker");
			var iYears = Math.floor(iDays / 2);
			if (iYears > 20) {
				iYears = 20;
			}
			oYearPicker.setYears(iYears);
		}

		var oStartDate = this._getStartDate();
		this._updateHeader(oStartDate);

		if (this.getDomRef()) {
			if (iDays > this._getDaysLarge()) {
				this.$().addClass("sapUiCalIntLarge");
			}else {
				this.$().removeClass("sapUiCalIntLarge");
			}

			if (iDays > this._iDaysMonthHead) {
				this.$().addClass("sapUiCalIntHead");
			}else {
				this.$().removeClass("sapUiCalIntHead");
			}
		}

		return this;

	};

	CalendarDateInterval.prototype._getDays = function(){

		var iDays = this.getDays();

		// in phone mode max 8 days are displayed
		if (sap.ui.Device.system.phone && iDays > 8) {
			return 8;
		} else {
			return iDays;
		}

	};

	CalendarDateInterval.prototype.setShowDayNamesLine = function(bShowDayNamesLine){

		this.setProperty("showDayNamesLine", bShowDayNamesLine, true);

		var oDatesRow = this.getAggregation("month")[0];
		oDatesRow.setShowDayNamesLine(bShowDayNamesLine);

		return this;

	};

	CalendarDateInterval.prototype._getShowMonthHeader = function(){

		var iDays = this._getDays();
		if (iDays > this._iDaysMonthHead) {
			return true;
		}else {
			return false;
		}

	};

	/**
	* @param {boolean} [bForceRecalculate] Indicates if it's called within the <code>startDate</code> property setter and therefore
	* needs to be recalculated
	* @private
	* @returns {sap.ui.unified.calendar.CalendarDate} the date
	*/
	CalendarDateInterval.prototype._getFocusedDate = function(bForceRecalculate){

		if (!this._oFocusedDate || bForceRecalculate) {
			this._oFocusedDate = null;
			Calendar.prototype._getFocusedDate.apply(this, arguments);
			var oStartDate = this.getStartDate();
			var oDatesRow = this.getAggregation("month")[0];
			if (!oStartDate) {
				// use focused date as start date
				this._setStartDate(this._oFocusedDate, false, true);
			}else if (!oDatesRow.checkDateFocusable(this._oFocusedDate.toLocalJSDate())) {
				this._oFocusedDate = CalendarDate.fromLocalJSDate(oStartDate, this.getPrimaryCalendarType());
			}
		}

		return this._oFocusedDate;

	};

	/**
	 * Setter for property <code>months</code>.
	 *
	 * Property <code>months</code> is not supported in <code>sap.ui.unified.CalendarDateInterval</code> control.
	 *
	 * @protected
	 * @param {int} iMonths How many months to be displayed
	 * @returns {sap.ui.unified.CalendarDateInterval} <code>this</code> to allow method chaining
	 * @name sap.ui.unified.CalendarDateInterval#setMonths
	 * @function
	 */
	CalendarDateInterval.prototype.setMonths = function(iMonths){

		if (iMonths == 1) {
			return this.setProperty("months", iMonths, false); // rerender
		} else {
			throw new Error("Property months not supported " + this);
		}

	};

	/**
	 * Setter for property <code>firstDayOfWeek</code>.
	 *
	 * Property <code>firstDayOfWeek</code> is not supported in <code>sap.ui.unified.CalendarDateInterval</code> control.
	 *
	 * @protected
	 * @param {int} [iFirstDayOfWeek] First day of the week
	 * @returns {sap.ui.unified.CalendarDateInterval} <code>this</code> to allow method chaining
	 * @name sap.ui.unified.CalendarDateInterval#setFirstDayOfWeek
	 * @function
	 */
	CalendarDateInterval.prototype.setFirstDayOfWeek = function(iFirstDayOfWeek){

		if (iFirstDayOfWeek == -1) {
			return this.setProperty("firstDayOfWeek", iFirstDayOfWeek, false); // rerender
		} else {
			throw new Error("Property firstDayOfWeek not supported " + this);
		}

	};

	/**
	* Focuses given date.
	* @param {Date} oDate a JavaScript date
	* @return {sap.ui.unified.Calendar} <code>this</code> for method chaining
	*/
	CalendarDateInterval.prototype.focusDate = function(oDate){

		var oDatesRow = this.getAggregation("month")[0];
		if (!oDatesRow.checkDateFocusable(oDate)) {
			this._focusDateExtend(CalendarDate.fromLocalJSDate(oDate, this.getPrimaryCalendarType()), true, true);
		}

		Calendar.prototype.focusDate.apply(this, arguments);

		return this;

	};

	CalendarDateInterval.prototype.onsaptabnext = function(oEvent){

		// if tab was pressed on a day it should jump to the month and then to the year button
		var oHeader = this.getAggregation("header");

		if (jQuery.sap.containsOrEquals(this.getDomRef("content"), oEvent.target)) {
			jQuery.sap.focus(oHeader.getDomRef("B1"));

			if (!this._bPoupupMode) {
				// remove Tabindex from day, month, year - to break cycle
				var aMonths = this.getAggregation("month");
				var oMonthPicker = this.getAggregation("monthPicker");
				var oYearPicker = this.getAggregation("yearPicker");
				for (var i = 0; i < aMonths.length; i++) {
					var oMonth = aMonths[i];
					jQuery(oMonth._oItemNavigation.getItemDomRefs()[oMonth._oItemNavigation.getFocusedIndex()]).attr("tabindex", "-1");
				}
				if (oMonthPicker.getDomRef()) {
					jQuery(oMonthPicker._oItemNavigation.getItemDomRefs()[oMonthPicker._oItemNavigation.getFocusedIndex()]).attr("tabindex", "-1");
				}
				if (oYearPicker.getDomRef()) {
					jQuery(oYearPicker._oItemNavigation.getItemDomRefs()[oYearPicker._oItemNavigation.getFocusedIndex()]).attr("tabindex", "-1");
				}
			}

			oEvent.preventDefault();
		} else if (!this.getPickerPopup() && oEvent.target.id == oHeader.getId() + "-B1") {
			jQuery.sap.focus(oHeader.getDomRef("B2"));

			oEvent.preventDefault();
		}

	};

	Calendar.prototype.onfocusin = function(oEvent){

		if (oEvent.target.id == this.getId() + "-end") {
			// focus via tab+shift (otherwise not possible to go to this element)
			var oHeader = this.getAggregation("header");
			var aMonths = this.getAggregation("month");
			var oMonthPicker = this.getAggregation("monthPicker");
			var oYearPicker = this.getAggregation("yearPicker");

			if (this.getPickerPopup()){
				jQuery.sap.focus(oHeader.getDomRef("B1"));
			} else {
				jQuery.sap.focus(oHeader.getDomRef("B2"));
			}

			if (!this._bPoupupMode) {
				// remove Tabindex from day, month, year - to break cycle
				for (var i = 0; i < aMonths.length; i++) {
					var oMonth = aMonths[i];
					jQuery(oMonth._oItemNavigation.getItemDomRefs()[oMonth._oItemNavigation.getFocusedIndex()]).attr("tabindex", "-1");
				}
				if (oMonthPicker.getDomRef()) {
					jQuery(oMonthPicker._oItemNavigation.getItemDomRefs()[oMonthPicker._oItemNavigation.getFocusedIndex()]).attr("tabindex", "-1");
				}
				if (oYearPicker.getDomRef()) {
					jQuery(oYearPicker._oItemNavigation.getItemDomRefs()[oYearPicker._oItemNavigation.getFocusedIndex()]).attr("tabindex", "-1");
				}
			}
		}

		// remove tabindex of dummy element if focus is inside calendar
		this.$("end").attr("tabindex", "-1");

	};

	CalendarDateInterval.prototype.onsapescape = function(oEvent){

		if (this.getPickerPopup()) {
			_closeCalendarPicker.call(this);
		} else {
			if (this._iMode == 0) {
				this.fireCancel();
			}

			this._closedPickers();
		}

	};

	/**
	 * Overrides the <code>Calendar#_focusDateExtend</code> in order to handle the focused date in a custom way.
	 *
	 * Set start date according to new focused date. If focused date is not in current rendered date interval
	 * new focused date should have the same position like the old one
	 *
	 * @param {sap.ui.unified.calendar.CalendarDate} oDate the date to focus
	 * @param {boolean} bOtherMonth determines whether the function is called due navigation outside the visible
	 * date range
	 * @param {boolean} bNoEvent hint to skip firing <code>startDateChange</code> event. If set to <code>true</code>,
	 * the parent is supposed to take care for firing.
	 * @returns {boolean} whether the parent should fire the <code>startDateChange</code> event
	 * @private
	 */
	CalendarDateInterval.prototype._focusDateExtend = function(oDate, bOtherMonth, bNoEvent) {
		if (bOtherMonth) {
			var oOldFocusedDate = this._getFocusedDate();
			var oOldStartDate = this._getStartDate();
			var iDay = CalendarUtils._daysBetween(oOldFocusedDate, oOldStartDate);
			var oNewStartDate = new CalendarDate(oDate, this.getPrimaryCalendarType());
			oNewStartDate.setDate(oNewStartDate.getDate() - iDay);
			this._setStartDate(oNewStartDate, false, true);

			if (!bNoEvent) {
				return true; // fire startDateChange event in caller at end of processing
			}
		}

		return false;

	};

	/**
	 * @param {sap.ui.unified.calendar.CalendarDate} oDate
	 * @override
	 * @private
	*/
	CalendarDateInterval.prototype._setMinMaxDateExtend = function(oDate){

		if (this._oStartDate) {
			// check if still in valid range
			if (this._oStartDate.isBefore(this._oMinDate)) {
				jQuery.sap.log.warning("start date < minDate -> minDate will be start date", this);
				this._setStartDate(new CalendarDate(this._oMinDate, this.getPrimaryCalendarType()), true, true);
			} else {
				var oEndDate = new CalendarDate(this._oStartDate);
				oEndDate.setDate(oEndDate.getDate() + this._getDays() - 1);
				if (oEndDate.isAfter(this._oMaxDate)) {
					jQuery.sap.log.warning("end date > maxDate -> start date will be changed", this);
					var oStartDate = new CalendarDate(this._oMaxDate);
					oStartDate.setDate(oStartDate.getDate() - this._getDays() + 1);
					this._setStartDate(oStartDate, true, true);
				}
			}
		}

	};

	CalendarDateInterval.prototype.setPickerPopup = function(bPickerPopup){

		this.setProperty("pickerPopup", bPickerPopup, true);

		var oMonthPicker = this.getAggregation("monthPicker");
		var oYearPicker = this.getAggregation("yearPicker");

		if (bPickerPopup) {
			oMonthPicker.setColumns(3);
			oMonthPicker.setMonths(12);
			oYearPicker.setColumns(4);
			oYearPicker.setYears(20);
		} else {
			oMonthPicker.setColumns(0);
			oMonthPicker.setMonths(6);
			oYearPicker.setColumns(0);
			oYearPicker.setYears(6);
		}

		return this;

	};

	/**
	* @param {sap.ui.unified.calendar.CalendarDate} oDate The currently focused date
	* @param {boolean} bCheckMonth Whether the month must be checked
	* @override
	* @private
	*/
	CalendarDateInterval.prototype._togglePrevNext = function(oDate, bCheckMonth){

		if (this._iMode > 1 || (this._iMode == 1 && this.getPickerPopup())) {
			return Calendar.prototype._togglePrevNext.apply(this, arguments);
		}

		var iYearMax = this._oMaxDate.getYear();
		var iYearMin = this._oMinDate.getYear();
		var iMonthMax = this._oMaxDate.getMonth();
		var iMonthMin = this._oMinDate.getMonth();
		var iDateMin = this._oMinDate.getDate();
		var iDateMax = this._oMaxDate.getDate();
		var oHeader = this.getAggregation("header");
		var iDays = this._getDays();
		var iYear;
		var oStartDate;
		var oEndDate;
		var iMonth;
		var iDate;

		if (this._iMode == 1 && !bCheckMonth) {
			// in line month picker don't disable buttons
			var oMonthPicker = this.getAggregation("monthPicker");
			var iMonths = oMonthPicker.getMonths();
			var iStartMonth = oMonthPicker.getStartMonth();
			var iEndMonth = iStartMonth + iMonths - 1;
			iYear = oDate.getYear();

			if (iStartMonth == 0 || (iYear == iYearMin && iStartMonth <= iMonthMin)) {
				oHeader.setEnabledPrevious(false);
			} else {
				oHeader.setEnabledPrevious(true);
			}

			if (iEndMonth > 10 || (iYear == iYearMax && iEndMonth >= iMonthMax)) {
				oHeader.setEnabledNext(false);
			} else {
				oHeader.setEnabledNext(true);
			}

			return;
		}

		oStartDate = this._getStartDate();
		oEndDate = new CalendarDate(oStartDate, this.getPrimaryCalendarType());
		oEndDate.setDate(oEndDate.getDate() + iDays - 1);

		if (CalendarUtils._isOutside(oDate, oStartDate,oEndDate)) {
			// date outside visible range
			oStartDate = new CalendarDate(oDate, this.getPrimaryCalendarType());
			oEndDate = new CalendarDate(oStartDate, this.getPrimaryCalendarType());
			oEndDate.setDate(oEndDate.getDate() + iDays - 1);
		}

		iYear = oStartDate.getYear();
		iMonth = oStartDate.getMonth();
		iDate = oStartDate.getDate();

		if (iYear < iYearMin ||
				(iYear == iYearMin &&
						(!bCheckMonth || iMonth < iMonthMin || (iMonth == iMonthMin && iDate <= iDateMin)))) {
			oHeader.setEnabledPrevious(false);
		}else {
			oHeader.setEnabledPrevious(true);
		}

		iYear = oEndDate.getYear();
		iMonth = oEndDate.getMonth();
		iDate = oEndDate.getDate();

		if (iYear > iYearMax ||
				(iYear == iYearMax &&
						(!bCheckMonth || iMonth > iMonthMax || (iMonth == iMonthMax && iDate >= iDateMax)))) {
			oHeader.setEnabledNext(false);
		} else {
			oHeader.setEnabledNext(true);
		}

	};

	/**
	* Shifts <code>startDate</code> and focusedDate according to given amount of time.
	*
	* @param {sap.ui.unified.calendar.CalendarDate} oStartDate start date
	* @param {sap.ui.unified.calendar.CalendarDate} oFocusedDate focused date
	* @param {int} iDays number of days to shift. Positive values will shift forward, negative - backward.
	* @private
	*/
	CalendarDateInterval.prototype._shiftStartFocusDates = function(oStartDate, oFocusedDate, iDays){
		oStartDate.setDate(oStartDate.getDate() + iDays);
		oFocusedDate.setDate(oFocusedDate.getDate() + iDays);
		this._setFocusedDate(oFocusedDate);
		this._setStartDate(oStartDate, true);
	};

	CalendarDateInterval.prototype._handlePrevious = function(oEvent){

		var oFocusedDate = new CalendarDate(this._getFocusedDate(), this.getPrimaryCalendarType());
		var oMonthPicker = this.getAggregation("monthPicker");
		var oYearPicker = this.getAggregation("yearPicker");
		var oStartDate =  new CalendarDate(this._getStartDate(),  this.getPrimaryCalendarType());
		var iDays = this._getDays();

		switch (this._iMode) {
		case 0: // day picker
			this._shiftStartFocusDates(oStartDate, oFocusedDate, (iDays * -1));
			break;

		case 1: // month picker
			if (oMonthPicker.getMonths() < 12) {
				oMonthPicker.previousPage();
				this._togglePrevNext(oFocusedDate);
			} else {
				oFocusedDate.setYear(oFocusedDate.getYear() - 1);
				var bFireStartDateChange = this._focusDateExtend(oFocusedDate, true, false);
				this._setFocusedDate(oFocusedDate);
				this._updateHeader(oFocusedDate);
				this._setDisabledMonths(oFocusedDate.getYear());

				if (bFireStartDateChange) {
					this.fireStartDateChange();
				}
			}
			break;

		case 2: // year picker
			oYearPicker.previousPage();
			this._togglePrevNexYearPicker();
			break;
			// no default
		}

	};

	CalendarDateInterval.prototype._handleNext = function(oEvent){

		var oFocusedDate = new CalendarDate(this._getFocusedDate(),  this.getPrimaryCalendarType());
		var oMonthPicker = this.getAggregation("monthPicker");
		var oYearPicker = this.getAggregation("yearPicker");
		var oStartDate = new CalendarDate(this._getStartDate(), this.getPrimaryCalendarType());
		var iDays = this._getDays();

		switch (this._iMode) {
		case 0: // day picker
			this._shiftStartFocusDates(oStartDate, oFocusedDate, iDays);
			break;

		case 1: // month picker
			if (oMonthPicker.getMonths() < 12) {
				oMonthPicker.nextPage();
				this._togglePrevNext(oFocusedDate);
			} else {
				oFocusedDate.setYear(oFocusedDate.getYear() + 1);
				var bFireStartDateChange = this._focusDateExtend(oFocusedDate, true, false);
				this._setFocusedDate(oFocusedDate);
				this._updateHeader(oFocusedDate);
				this._setDisabledMonths(oFocusedDate.getYear());

				if (bFireStartDateChange) {
					this.fireStartDateChange();
				}
			}
			break;

		case 2: // year picker
			oYearPicker.nextPage();
			this._togglePrevNexYearPicker();
			break;
			// no default
		}

	};

	/**
	*
	* @param {sap.ui.unified.calendar.CalendarDate} oDate A date to determine the first of the displayed months
	* @returns {int[]} The displayed months rendered for a given date
	* @override
	* @private
	*/
	CalendarDateInterval.prototype._getDisplayedMonths = function(oDate){

		var aMonths = [];
		var iMonth = oDate.getMonth();
		var iDays = this._getDays();

		aMonths.push(iMonth);
		if (iDays > this._getDaysLarge()) {
			// of only a few days displayed, there is not enough space for 2 Months in Button
			var oEndDate = new CalendarDate(oDate, this.getPrimaryCalendarType());
			oEndDate.setDate(oEndDate.getDate() + iDays - 1);
			var iEndMonth = oEndDate.getMonth();
			while (iMonth != iEndMonth) {
				iMonth = (iMonth + 1) % 12;
				aMonths.push(iMonth);
			}
		}

		return aMonths;

	};

	CalendarDateInterval.prototype._getDisplayedSecondaryMonths = function(sPrimaryCalendarType, sSecondaryCalendarType){

		var iDays = this._getDays();
		var oStartDate = new CalendarDate(this._getStartDate(), sSecondaryCalendarType);
		var iStartMonth = oStartDate.getMonth();

		var oEndDate = new CalendarDate(oStartDate, this.getPrimaryCalendarType());
		oEndDate.setDate(oEndDate.getDate() + iDays - 1);
		oEndDate = new CalendarDate(oEndDate, sSecondaryCalendarType);
		var iEndMonth = oEndDate.getMonth();

		return {start: iStartMonth, end: iEndMonth};

	};

	CalendarDateInterval.prototype._openPickerPopup = function(oPicker){

		if (!this._oPopup) {
			jQuery.sap.require("sap.ui.core.Popup");
			this._oPopup = new sap.ui.core.Popup();
			this._oPopup.setAutoClose(true);
			this._oPopup.setAutoCloseAreas([this.getDomRef()]);
			this._oPopup.setDurations(0, 0); // no animations
			this._oPopup._oCalendar = this;
			this._oPopup.attachClosed(_handlePopupClosed, this);
			this._oPopup.onsapescape = function(oEvent) {
				this._oCalendar.onsapescape(oEvent);
			};
		}

		this._oPopup.setContent(oPicker);

		var oHeader = this.getAggregation("header");
		var eDock = sap.ui.core.Popup.Dock;
		this._oPopup.open(0, eDock.CenterTop, eDock.CenterTop, oHeader, null, "flipfit", true);

	};

	/**
	 * Sets given start date as date in local.
	 *
	 * @param {sap.ui.unified.calendar.CalendarDate} oStartDate Date that should be taken to create the local JavaScript date.
	 * E.g. if the date is Dec 21th 1981, the local date (CEST) would be Dec 21th, 1981 00:00:00 GMT +02:00
	 * @param {boolean} bSetFocusDate if true, sets this date as focused date
	 * @param {boolean} bNoEvent describes whether the startDateChange event was previously thrown
	 * @private
	*/
	CalendarDateInterval.prototype._setStartDate = function (oStartDate, bSetFocusDate, bNoEvent) {

		var oMaxDate = new CalendarDate(this._oMaxDate, this.getPrimaryCalendarType());
		oMaxDate.setDate(oMaxDate.getDate() - this._getDays() + 1);
		if (oMaxDate.isBefore(this._oMinDate)) {
			// min and max smaller than interval
			oMaxDate = new CalendarDate(this._oMinDate);
			oMaxDate.setDate(oMaxDate.getDate() + this._getDays() - 1);
		}

		if (oStartDate.isBefore(this._oMinDate)) {
			oStartDate = new CalendarDate(this._oMinDate, this.getPrimaryCalendarType());
		}else if (oStartDate.isAfter(oMaxDate)) {
			oStartDate = oMaxDate;
		}

		var oLocaleDate = oStartDate.toLocalJSDate();
		this.setProperty("startDate", oLocaleDate, true);
		this._oStartDate = oStartDate;

		var oDatesRow = this.getAggregation("month")[0];
		oDatesRow.setStartDate(oLocaleDate);

		this._updateHeader(oStartDate);

		if (bSetFocusDate) {
			var oDate = this._getFocusedDate().toLocalJSDate();
			if (!oDatesRow.checkDateFocusable(oDate)) {
				//focused date not longer visible -> focus start date
				this._setFocusedDate(oStartDate);
				oDatesRow.setDate(oLocaleDate);
			}else {
				oDatesRow.setDate(oDate);
			}
		}

		if (!bNoEvent) {
			this.fireStartDateChange();
		}

	};

	/**
	* Gets the start date as CalendarDate (timezone agnostic)
	*
	* E.g. if the date is Dec 21th 1981, the result date would be Dec 21th, 1981 00:00:00 GMT
	* @private
	 *@returns {sap.ui.unified.calendar.CalendarDate} the date
	*/

	CalendarDateInterval.prototype._getStartDate = function(){

		if (!this._oStartDate) {
			// no start date set, use focused date
			this._oStartDate = this._getFocusedDate();
		}

		return this._oStartDate;

	};

	function _handlePopupClosed(oEvent) {

		_closeCalendarPicker.call(this);

	}

	function _handleMonthPickerPageChange(oEvent) {

		var oFocusedDate = new CalendarDate(this._getFocusedDate(), this.getPrimaryCalendarType());
		this._togglePrevNext(oFocusedDate);

	}

	function _handleYearPickerPageChange(oEvent) {

		this._togglePrevNexYearPicker();

	}

	return CalendarDateInterval;

}, /* bExport= */ true);
