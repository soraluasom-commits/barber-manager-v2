/* One delegated binding per event. Templates contain named actions and escaped data only. */
(() => {
  'use strict';

  const arg = element => element.dataset.cspArg ?? '';
  const index = element => Number(arg(element));
  const filterKeys = new Set([
    'entryDate', 'expMonth', 'expYear', 'incomeMonth', 'incomeYear', 'fundMonth',
    'q', 'histStaff', 'histMonth', 'attendanceDate', 'daysOffStaff', 'daysOffMonth', 'daysOffYear',
  ]);
  const setFilter = (event, element) => {
    const key = arg(element);
    if (!filterKeys.has(key)) return;
    filters[key] = element.value;
    render();
  };
  const actions = {
    click: {
      'menu-group': (_, element) => openMenuGroup(arg(element)),
      'go': (_, element) => go(arg(element)),
      'side': () => toggleSide(),
      'theme': () => toggleTheme(),
      'close-modal': () => closeModal(),
      'modal-backdrop': (event, element) => { if (event.target === element) closeModal(); },
      'menu-navigate': (event, element) => menuNavigate(arg(element), event),
      'menu-up': (event, element) => moveMenu(arg(element), -1, event),
      'menu-down': (event, element) => moveMenu(arg(element), 1, event),
      'menu-reorder': () => toggleMenuReorder(),
      'menu-reset': () => resetMenuOrder(),
      'toggle-tip': (_, element) => element.classList.toggle('tip-open'),
      'entry': (_, element) => openEntryModal(arg(element)),
      'expense': (_, element) => openExpenseModal(arg(element)),
      'income': (_, element) => openIncomeModal(arg(element)),
      'delete-entry': (_, element) => del('entries', arg(element)),
      'delete-expense': (_, element) => del('expenses', arg(element)),
      'delete-income': (_, element) => del('funds', arg(element)),
      'monthly-jpg': (_, element) => saveMonthlySummaryJPG(arg(element)),
      'month-csv': (_, element) => exportMonthCSV(arg(element)),
      'monthly-details': (_, element) => toggleAnnualDetail('monthlyDailyDetails', element, 'รายการ'),
      'annual-expense-details': (_, element) => toggleAnnualDetail('annualExpenseDetails', element),
      'annual-income-details': (_, element) => toggleAnnualDetail('annualIncomeDetails', element),
      'add-staff': () => addStaff(),
      'rename-staff': (_, element) => renameStaff(index(element)),
      'remove-staff': (_, element) => removeStaff(index(element)),
      'edit-shop-name': () => editShopName(),
      'clear-shop-name': () => clearShopName(),
      'snapshot': () => createIDBSnapshot(true),
      'restore-snapshot': () => restoreLatestIDBSnapshot(),
      'backup': () => saveBackupAs(),
      'all-csv': () => exportAllCSV(),
      'reset-shop': () => resetSeedWeb(),
      'clear-learning': () => BarberLearning.clear(),
      'attendance-backfill': () => BarberOps.backfill(),
      'attendance-undo': () => BarberOps.undoBackfill(),
      'leave-reason': (_, element) => BarberOps.leaveReason(index(element)),
      'personal-jpg': () => PersonalReport.exportJPG(),
      'staff-identity': () => StaffIdentity.prepare(),
      'staff-photo': (_, element) => BarberStaff.open(index(element)),
    },
    change: {
      'filter': setFilter,
      'import-json': (_, element) => importJSON(element.files[0]),
      'personal-filter': (_, element) => PersonalReport.change(arg(element), element.value),
      'report-staff': (_, element) => WorkDetails.setStaff(element.value),
      'attendance': (_, element) => BarberOps.setAttendance(index(element), element.value),
    },
    input: {'filter': setFilter},
    submit: {
      'entry': (event, element) => saveEntry(event, arg(element)),
      'goals': (event, element) => saveGoals(event, arg(element)),
      'expense': (event, element) => saveExpense(event, arg(element)),
      'income': (event, element) => saveIncome(event, arg(element)),
    },
    blur: {'close-tip': (_, element) => element.classList.remove('tip-open')},
    dragstart: {'menu': (event, element) => menuDragStart(event, arg(element))},
    dragover: {'menu': event => menuDragOver(event)},
    dragleave: {'menu': event => menuDragLeave(event)},
    dragend: {'menu': event => menuDragEnd(event)},
    drop: {'menu': (event, element) => menuDrop(event, arg(element))},
  };

  for (const [type, handlers] of Object.entries(actions)) {
    const attribute = 'data-csp-' + type;
    document.addEventListener(type, event => {
      const element = event.target instanceof Element ? event.target.closest('[' + attribute + ']') : null;
      if (!element || (type === 'blur' && event.target !== element)) return;
      const action = element.getAttribute(attribute);
      if (Object.hasOwn(handlers, action)) handlers[action](event, element);
    }, type === 'blur');
  }
})();
