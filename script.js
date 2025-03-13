let allFiles = []; // لتخزين جميع الملفات
let selectedColumns = []; // لتخزين الأعمدة المحددة
let splitColumns = []; // لتخزين الأعمدة التي سيتم التقسيم بناءً عليها
let columnWidths = {}; // لتخزين عرض الأعمدة
let allStudents = []; // لتخزين جميع بيانات الطلاب
let dataTable; // متغير لتخزين كائن DataTable


const today = new Date().toISOString().split('T')[0];

function loadColumns() {
    const fileInput = document.getElementById('fileInput');
    const columnSelector = document.getElementById('columnSelector');
    const columnList = document.getElementById('columnList');
    const splitColumnList = document.getElementById('splitColumnList');
    const searchSection = document.getElementById('searchSection');

    columnList.innerHTML = ''; // مسح المحتوى السابق
    splitColumnList.innerHTML = ''; // مسح المحتوى السابق

    const reader = new FileReader();
    reader.readAsArrayBuffer(fileInput.files[0]);

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        allStudents = XLSX.utils.sheet_to_json(sheet, { defval: '' }); // تخزين جميع البيانات
        searchSection.style.display = 'block';


        // الحصول على جميع الأعمدة من الصف الأول
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const columns = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
            const cell = sheet[cellAddress];
            columns.push(cell ? cell.v : `Column ${C + 1}`); // استخدام اسم افتراضي إذا كانت الخلية فارغة
        }

        columnSelector.style.display = 'block'; // إظهار قسم اختيار الأعمدة

        columns.forEach((column, index) => {
            // إنشاء عناصر قائمة الأعمدة للتصدير
            const li = document.createElement('li');
            li.setAttribute('data-column', column);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true; // تحديد الأعمدة افتراضيًا
            checkbox.addEventListener('change', () => {
                updateSelectedColumns();
            });

            const label = document.createElement('span');
            label.textContent = column || `Column ${index + 1}`; // استخدام اسم افتراضي إذا كانت القيمة فارغة

            const widthInput = document.createElement('input');
            widthInput.type = 'number';
            widthInput.placeholder = 'العرض';
            widthInput.value = 15; // قيمة افتراضية
            widthInput.addEventListener('input', (e) => {
                columnWidths[column] = e.target.value;
            });

            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(widthInput);
            columnList.appendChild(li);

            // إنشاء عناصر قائمة الأعمدة للتقسيم
            const splitLi = document.createElement('li');
            splitLi.setAttribute('data-column', column);

            const splitCheckbox = document.createElement('input');
            splitCheckbox.type = 'checkbox';
            splitCheckbox.addEventListener('change', () => {
                updateSplitColumns();
            });

            const splitLabel = document.createElement('span');
            splitLabel.textContent = column || `Column ${index + 1}`;

            const splitTypeSelect = document.createElement('select');
            splitTypeSelect.innerHTML = `
                <option value="folder">مجلد</option>
                <option value="file">ملف Excel</option>
                <option value="sheet">ورقة داخل ملف</option>
            `;
            splitLi.appendChild(splitCheckbox);
            splitLi.appendChild(splitLabel);
            splitLi.appendChild(splitTypeSelect);
            splitColumnList.appendChild(splitLi);
        });

        // تفعيل سحب وإسقاط العناصر
        Sortable.create(columnList, {
            animation: 150,
            onEnd: () => {
                updateSelectedColumns();
            }
        });

        Sortable.create(splitColumnList, {
            animation: 150,
            onEnd: () => {
                updateSplitColumns();
            }
        });

        // تحديث الأعمدة المحددة
        updateSelectedColumns();
        updateSplitColumns();
    };
}

function searchStudent() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const searchSection = document.getElementById('searchSection');
    
    if (!searchTerm) {
        alert('⚠️ الرجاء إدخال مصطلح البحث.');
        return;
    }
    
    // إذا كان هناك DataTable مُهيأ مسبقاً، قم بتدميره مع إزالة العناصر المُنشأة
    if (dataTable) {
        dataTable.destroy(true); // تدمير DataTable وإزالة الحاوية الملتفة
        dataTable = null;
    }
    
    // إزالة الحاوية الملتفة التي ينشئها DataTable (إذا وُجدت)
    const oldWrapper = document.getElementById('searchResults_wrapper');
    if (oldWrapper) {
        oldWrapper.remove();
    }
    
    // إزالة الجدول السابق (إذا وُجد)
    const oldTable = document.getElementById('searchResults');
    if (oldTable) {
        oldTable.remove();
    }
    
    // إنشاء جدول جديد
    const newTable = document.createElement('table');
    newTable.id = 'searchResults';
    newTable.className = 'display';
    newTable.style.width = '100%';
    
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    // إنشاء رأس الجدول بناءً على الأعمدة المحددة للتصدير
    const headerRow = document.createElement('tr');
    selectedColumns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // البحث في البيانات
    const filteredStudents = allStudents.filter(student => {
        // تقسيم مصطلح البحث إلى أجزاء
        const searchTerms = searchTerm.split(/\s+/);
        // التحقق من تطابق جميع أجزاء البحث
        return searchTerms.every(term => {
            return selectedColumns.some(column => {
                const value = student[column] ? student[column].toString().toLowerCase() : '';
                return value.includes(term);
            });
        });
    });
    
    if (filteredStudents.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.setAttribute('colspan', selectedColumns.length);
        cell.style.textAlign = 'center';
        cell.textContent = 'لا توجد نتائج';
        row.appendChild(cell);
        tbody.appendChild(row);
    } else {
        // عرض النتائج في الجدول
        filteredStudents.forEach(student => {
            const row = document.createElement('tr');
            selectedColumns.forEach(column => {
                const td = document.createElement('td');
                td.textContent = student[column] || '';
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });
    }
    
    newTable.appendChild(thead);
    newTable.appendChild(tbody);
    searchSection.appendChild(newTable);
    
    // تهيئة DataTable مع ميزات التصدير والترتيب
    dataTable = $(newTable).DataTable({
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excel',
                text: 'تنزيل النتائج كملف Excel',
                className: 'btn btn-primary',
                title: 'نتائج البحث',
                exportOptions: {
                    columns: ':visible'
                }
            }
        ],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/ar.json' // ترجمة إلى العربية
        },
        order: [], // تعطيل الترتيب الافتراضي
        columnDefs: [
            { orderable: true, targets: '_all' } // تمكين الترتيب لجميع الأعمدة
        ]
    });
}


function updateSelectedColumns() {
    const columnList = document.getElementById('columnList');
    selectedColumns = Array.from(columnList.children)
        .filter(li => li.querySelector('input[type="checkbox"]').checked)
        .map(li => li.getAttribute('data-column'));
}

function updateSplitColumns() {
    const splitColumnList = document.getElementById('splitColumnList');
    splitColumns = Array.from(splitColumnList.children)
        .filter(li => li.querySelector('input[type="checkbox"]').checked)
        .map(li => ({
            column: li.getAttribute('data-column'),
            type: li.querySelector('select').value
        }));
}



function processFile2() {
    const fileInput = document.getElementById('fileInput');
    const downloadLinksDiv = document.getElementById('downloadLinks');
    const downloadAllButton = document.getElementById('downloadAllButton');
    downloadLinksDiv.innerHTML = '⏳ جارٍ إنشاء الروابط...';
    downloadAllButton.style.display = 'none'; // إخفاء زر تنزيل الكل مؤقتًا

    // تحديث الأعمدة المحددة
    updateSelectedColumns();

    if (selectedColumns.length === 0) {
        alert('⚠️ الرجاء تحديد الأعمدة المراد تصديرها.');
        return;
    }

    const reader = new FileReader();
    reader.readAsArrayBuffer(fileInput.files[0]);

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        const today = new Date().toISOString().split('T')[0]; // تاريخ اليوم

        const regions = {};
        rows.forEach(row => {
            const region = row['المنطقة التعليمية'] || 'غير محددة';
            const school = row['المدرسة'] || 'مدرسة غير معروفة';
            const grade = row['الصف'] || 'غير محدد';
            const section = row['الشعبة'] || 'غير محدد';

            if (!regions[region]) regions[region] = {};
            if (!regions[region][school]) regions[region][school] = {};
            if (!regions[region][school][grade]) regions[region][school][grade] = {};
            if (!regions[region][school][grade][section]) regions[region][school][grade][section] = [];

            const filteredRow = {};
            selectedColumns.forEach(column => {
                filteredRow[column] = row[column] || '';
            });

            regions[region][school][grade][section].push(filteredRow);
        });

        downloadLinksDiv.innerHTML = ''; // مسح الرسالة المؤقتة
        allFiles = []; // إعادة تهيئة قائمة الملفات

        const zip = new JSZip();

        for (const region in regions) {
            const regionFolder = zip.folder(region.replace(/[\\/:*?\[\]]/g, '_'));

            for (const school in regions[region]) {
                const schoolWorkbook = XLSX.utils.book_new();

                // إضافة خصائص الملف
                schoolWorkbook.Props = {
                    Title: `تقرير ${school}`,
                    Author: 'Mr. Maher Zalan',
                    Company: 'مدرسة ' + school,
                    CreatedDate: new Date(),
                    Comments: 'تم إنشاء هذا الملف بواسطة Mr. Maher Zalan. حقوق النشر محفوظة.'
                };

                // إضافة ورقة حقوق النشر
                const copyrightData = [
                    [`تقرير ${school}`, ""],
                    ["التاريخ: " + today, ""]
                ];
                const copyrightSheet = XLSX.utils.aoa_to_sheet(copyrightData);
                XLSX.utils.book_append_sheet(schoolWorkbook, copyrightSheet, "معلومات");

                for (const grade in regions[region][school]) {
                    for (const section in regions[region][school][grade]) {
                        const sheetName = `${grade}_${section}`;
                        const sheetData = regions[region][school][grade][section];
                        const sheet = XLSX.utils.json_to_sheet(sheetData, {
                            header: selectedColumns,
                            skipHeader: false
                        });

                        // تطبيق عرض الأعمدة
                        sheet['!cols'] = selectedColumns.map(column => ({
                            wch: columnWidths[column] || 15
                        }));

                        XLSX.utils.book_append_sheet(schoolWorkbook, sheet, sheetName);
                    }
                }

                const fileName = `${school.replace(/[\\/:*?\[\]]/g, '_')}.xlsx`;
                const arrayBuffer = XLSX.write(schoolWorkbook, { bookType: 'xlsx', type: 'array' });
                regionFolder.file(fileName, arrayBuffer);
            }
        }

        // إنشاء الأرشيف وتنزيله
        zip.generateAsync({ type: 'blob' })
            .then(content => {
                const url = URL.createObjectURL(content);
                const link = document.createElement('a');
                link.href = url;
                link.download = `الملفات_المصنفة_${today}.zip`;
                link.textContent = `تنزيل الأرشيف الكامل`;
                link.classList.add('download-link');
                downloadLinksDiv.appendChild(link);

                // إظهار زر تنزيل الكل
                downloadAllButton.style.display = 'inline-block';
            });
    };
}
// تم تحديث الكود لحل مشكلة الملفات الفارغة عند تقسيم ملف الطلاب
function processFile1() {
    const fileInput = document.getElementById('fileInput');
    const downloadLinksDiv = document.getElementById('downloadLinks');
    const downloadAllButton = document.getElementById('downloadAllButton');
    downloadLinksDiv.innerHTML = '⏳ جارٍ إنشاء الروابط...';
    downloadAllButton.style.display = 'none';

    updateSelectedColumns();

    if (selectedColumns.length === 0) {
        alert('⚠️ الرجاء تحديد الأعمدة المراد تصديرها.');
        return;
    }

    const reader = new FileReader();
    reader.readAsArrayBuffer(fileInput.files[0]);

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        //const sanitizeName = (name) => name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
        

        const groupedData = {};
        rows.forEach(row => {
            //const region = sanitizeName(row['المنطقة التعليمية'] || 'غير محدد');
            //const grade = sanitizeName(row['الصف'] || 'غير محدد');
            const region = row['المنطقة التعليمية'] || 'غير محددة';
            const grade = row['الصف'] || 'غير محدد';

            if (!groupedData[region]) groupedData[region] = {};
            if (!groupedData[region][grade]) groupedData[region][grade] = [];

            const filteredRow = {};
            selectedColumns.forEach(column => {
                filteredRow[column] = row[column] ?? '';
            });

            groupedData[region][grade].push(filteredRow);
        });

        const zip = new JSZip();
        Object.entries(groupedData).forEach(([region, grades]) => {
            const workbook = XLSX.utils.book_new();
            Object.entries(grades).forEach(([grade, rows]) => {
                const sheet = XLSX.utils.json_to_sheet(rows, { header: selectedColumns });
                XLSX.utils.book_append_sheet(workbook, sheet, grade);
            });
            const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            zip.file(`${region}.xlsx`, arrayBuffer);
        });

        zip.generateAsync({ type: 'blob' }).then(content => {
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = ` التقسيم_حسب_المنطقة_${today}.zip`;
            link.textContent = 'تنزيل الأرشيف الكامل';
            link.classList.add('download-link');
            downloadLinksDiv.appendChild(link);
            downloadAllButton.style.display = 'inline-block';
        });
    };
}

function processFile3() {
    const fileInput = document.getElementById('fileInput');
    const downloadLinksDiv = document.getElementById('downloadLinks');
    const downloadAllButton = document.getElementById('downloadAllButton');
    downloadLinksDiv.innerHTML = '⏳ جارٍ إنشاء الروابط...';
    downloadAllButton.style.display = 'none';

    updateSelectedColumns();

    if (selectedColumns.length === 0) {
        alert('⚠️ الرجاء تحديد الأعمدة المراد تصديرها.');
        return;
    }

    const reader = new FileReader();
    reader.readAsArrayBuffer(fileInput.files[0]);

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        //const sanitizeName = (name) => name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
        

        const groupedData = {};
        rows.forEach(row => {
            //const region = sanitizeName(row['المنطقة التعليمية'] || 'غير محدد');
            //const grade = sanitizeName(row['الصف'] || 'غير محدد');
            const region = row['deliveredToRep'] || 'غير محددة';
            const grade = row['CycleName'] || 'غير محدد';

            if (!groupedData[region]) groupedData[region] = {};
            if (!groupedData[region][grade]) groupedData[region][grade] = [];

            const filteredRow = {};
            selectedColumns.forEach(column => {
                filteredRow[column] = row[column] ?? '';
            });

            groupedData[region][grade].push(filteredRow);
        });

        const zip = new JSZip();
        Object.entries(groupedData).forEach(([region, grades]) => {
            const workbook = XLSX.utils.book_new();
            Object.entries(grades).forEach(([grade, rows]) => {
                const sheet = XLSX.utils.json_to_sheet(rows, { header: selectedColumns });
                XLSX.utils.book_append_sheet(workbook, sheet, grade);
            });
            const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            zip.file(`${region}_${today}.xlsx`, arrayBuffer);
        });

        zip.generateAsync({ type: 'blob' }).then(content => {
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = ` التقسيم_حسب_مركز التوزيع${today}.zip`;
            link.textContent = 'تنزيل الأرشيف الكامل';
            link.classList.add('download-link');
            downloadLinksDiv.appendChild(link);
            downloadAllButton.style.display = 'inline-block';
        });
    };
}


function processFile() {
    const fileInput = document.getElementById('fileInput');
    const downloadLinksDiv = document.getElementById('downloadLinks');
    const downloadAllButton = document.getElementById('downloadAllButton');
    downloadLinksDiv.innerHTML = '⏳ جارٍ إنشاء الروابط...';
    downloadAllButton.style.display = 'none'; // إخفاء زر تنزيل الكل مؤقتًا

    // تحديث الأعمدة المحددة
    updateSelectedColumns();
    updateSplitColumns();

    if (selectedColumns.length === 0) {
        alert('⚠️ الرجاء تحديد الأعمدة المراد تصديرها.');
        return;
    }

    if (splitColumns.length === 0) {
        alert('⚠️ الرجاء تحديد الأعمدة التي سيتم التقسيم بناءً عليها.');
        return;
    }

    const reader = new FileReader();
    reader.readAsArrayBuffer(fileInput.files[0]);

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const sanitizeName = (name) => name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();

        const groupedData = {};
        rows.forEach(row => {
            let currentLevel = groupedData;
            splitColumns.forEach(({ column, type }) => {
                const value = sanitizeName(row[column] || 'غير محدد');
                if (!currentLevel[value]) {
                    currentLevel[value] = {};
                }
                currentLevel = currentLevel[value];
            });

            const filteredRow = {};
            selectedColumns.forEach(column => {
                filteredRow[column] = row[column] ?? '';
            });

            if (!currentLevel.rows) {
                currentLevel.rows = [];
            }
            currentLevel.rows.push(filteredRow);
        });

        const zip = new JSZip();

        const processGroup = (group, path, depth = 0) => {
            for (const key in group) {
                if (key === 'rows') {
                    // إذا وصلنا إلى مستوى الصفوف، ننشئ ملف Excel
                    if (group.rows.length > 0) { // تحقق من وجود بيانات
                        const workbook = XLSX.utils.book_new();
                        const sheetName = 'Data'; // اسم الورقة الافتراضي
                        const sheet = XLSX.utils.json_to_sheet(group.rows, {
                            header: selectedColumns,
                            skipHeader: false
                        });

                        // تطبيق عرض الأعمدة
                        sheet['!cols'] = selectedColumns.map(column => ({
                            wch: columnWidths[column] || 15
                        }));

                        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
                        const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                        const fileName = `${path.join('_')}.xlsx`;
                        zip.file(fileName, arrayBuffer);
                    }
                } else {
                    const { type } = splitColumns[depth];
                    if (type === 'folder') {
                        // إنشاء مجلد جديد
                        const folder = path.length > 0 ? zip.folder(path.join('/')) : zip;
                        processGroup(group[key], [], depth + 1);
                    } else if (type === 'file') {
                        // إنشاء ملف Excel جديد
                        processGroup(group[key], [...path, key], depth + 1);
                    } else if (type === 'sheet') {
                        // إذا كان النوع "ورقة داخل ملف"، ننشئ أوراقًا متعددة داخل ملف Excel واحد
                        const workbook = XLSX.utils.book_new();
                        let hasSheets = false; // تحقق من وجود أوراق

                        for (const subKey in group[key]) {
                            if (subKey !== 'rows' && group[key][subKey].rows.length > 0) {
                                const sheetName = subKey; // اسم الورقة بناءً على القيمة
                                const sheet = XLSX.utils.json_to_sheet(group[key][subKey].rows, {
                                    header: selectedColumns,
                                    skipHeader: false
                                });

                                // تطبيق عرض الأعمدة
                                sheet['!cols'] = selectedColumns.map(column => ({
                                    wch: columnWidths[column] || 15
                                }));

                                XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
                                hasSheets = true; // تمت إضافة ورقة واحدة على الأقل
                            }
                        }

                        if (hasSheets) { // إذا كان هناك أوراق، ننشئ الملف
                            const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                            const fileName = `${path.join('_')}.xlsx`;
                            zip.file(fileName, arrayBuffer);
                        }
                    }
                }
            }
        };

        processGroup(groupedData, []);

        // إنشاء الأرشيف وتنزيله
        zip.generateAsync({ type: 'blob' })
            .then(content => {
                const url = URL.createObjectURL(content);
                const link = document.createElement('a');
                link.href = url;
                link.download = `الملفات_المصنفة_${today}.zip`;
                link.textContent = `تنزيل الأرشيف الكامل`;
                link.classList.add('download-link');
                downloadLinksDiv.appendChild(link);

                // إظهار زر تنزيل الكل
                downloadAllButton.style.display = 'inline-block';
            });
    };
}


function downloadAll() {
    const zip = new JSZip();

    // إضافة جميع الملفات إلى الأرشيف
    allFiles.forEach(file => {
        zip.file(file.fileName, file.blob);
    });

    // إنشاء الأرشيف وتنزيله
    zip.generateAsync({ type: 'blob' })
        .then(content => {
            saveAs(content, `الملفات_المصنفة_${today}.zip`);
        });
}