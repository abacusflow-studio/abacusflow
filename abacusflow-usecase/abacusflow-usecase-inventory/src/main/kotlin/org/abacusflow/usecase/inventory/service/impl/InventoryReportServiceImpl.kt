package org.abacusflow.usecase.inventory.service.impl

import com.lowagie.text.Document
import com.lowagie.text.Element
import com.lowagie.text.Font
import com.lowagie.text.PageSize
import com.lowagie.text.Paragraph
import com.lowagie.text.Phrase
import com.lowagie.text.pdf.BaseFont
import com.lowagie.text.pdf.PdfPTable
import com.lowagie.text.pdf.PdfWriter
import org.abacusflow.usecase.inventory.InventoryUnitForExportTO
import org.abacusflow.usecase.inventory.service.InventoryReportService
import org.abacusflow.usecase.inventory.service.InventoryUnitQueryService
import org.apache.poi.ss.usermodel.FillPatternType
import org.apache.poi.ss.usermodel.HorizontalAlignment
import org.apache.poi.ss.usermodel.IndexedColors
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.springframework.stereotype.Service
import java.io.ByteArrayOutputStream
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Service
class InventoryReportServiceImpl(
    private val inventoryUnitQueryService: InventoryUnitQueryService,
) : InventoryReportService {
    override fun exportInventoryAsPdf(productCategoryId: Long?): ByteArray {
        // TODO 批量查询防止oom
        val units = inventoryUnitQueryService.listInventoryUnitsForExport(productCategoryId)
        require(units.isNotEmpty()) { "导出数据为空，无法生成 PDF" }
        return generatePdf(units)
    }

    override fun exportInventoryAsExcel(productCategoryId: Long?): ByteArray {
        // TODO 批量查询防止oom
        val units = inventoryUnitQueryService.listInventoryUnitsForExport(productCategoryId)
        require(units.isNotEmpty()) { "导出数据为空，无法生成 PDF" }
        return generateExcel(units)
    }

    fun generateExcel(units: List<InventoryUnitForExportTO>): ByteArray {
        val workbook = XSSFWorkbook()
        val sheet = workbook.createSheet("库存单元清单")

        // 使用与 PDF 相同的表头
        val headers =
            listOf(
                "库存名称", "类型", "状态", "当前数量", "可用数量", "单价(元)",
                "收货时间", "供应商", "序列号", "批次号", "存储点",
            )

        // 表头样式
        val headerStyle =
            workbook.createCellStyle().apply {
                fillForegroundColor = IndexedColors.GREY_25_PERCENT.index
                fillPattern = FillPatternType.SOLID_FOREGROUND
                alignment = HorizontalAlignment.CENTER
                setFont(
                    workbook.createFont().apply {
                        bold = true
                    },
                )
            }

        // 写入表头
        val headerRow = sheet.createRow(0)
        headers.forEachIndexed { index, title ->
            val cell = headerRow.createCell(index)
            cell.setCellValue(title)
            cell.cellStyle = headerStyle
        }

        // 写入实际数据
        units.forEachIndexed { index, unit ->
            val row = sheet.createRow(index + 1)

            // 按照表头顺序填充数据
            row.createCell(0).setCellValue(unit.title)
            row.createCell(1).setCellValue(mapInventoryUnitTypeToChinese(unit.type))
            row.createCell(2).setCellValue(mapInventoryUnitStatusToChinese(unit.status))
            row.createCell(3).setCellValue(unit.quantity.toDouble())
            row.createCell(4).setCellValue(unit.remainingQuantity.toDouble())
            row.createCell(5).setCellValue(unit.unitPrice.toDouble())
            row.createCell(6).setCellValue(formatter.format(unit.receivedAt))
            row.createCell(7).setCellValue(unit.supplierName)
            row.createCell(8).setCellValue(unit.serialNumber ?: "-")
            row.createCell(9).setCellValue(unit.batchCode?.toString() ?: "-")
            row.createCell(10).setCellValue(unit.depotName ?: "-")
        }

        // 自动列宽
        headers.indices.forEach { sheet.autoSizeColumn(it) }

        // 输出为 ByteArray
        return ByteArrayOutputStream().use { out ->
            workbook.write(out)
            workbook.close()
            out.toByteArray()
        }
    }

    fun generatePdf(units: List<InventoryUnitForExportTO>): ByteArray {
        val document = Document(PageSize.A4.rotate())
        val outputStream = ByteArrayOutputStream()
        PdfWriter.getInstance(document, outputStream)
        document.open()

//        val font = FontFactory.getFont("Helvetica", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, 10f)
        val fontPath = "fonts/SimSun.ttf"
        val baseFont = BaseFont.createFont(fontPath, BaseFont.IDENTITY_H, BaseFont.EMBEDDED)
        val font = Font(baseFont, 10f)

        val title =
            Paragraph("库存单元清单 - ${LocalDate.now()}", font).apply {
                alignment = Element.ALIGN_CENTER
                spacingAfter = 10f
            }
        document.add(title)

        val table =
            PdfPTable(11).apply {
                widthPercentage = 100f
                setWidths(floatArrayOf(5f, 1.5f, 1.0f, 1.0f, 1.0f, 1.5f, 2.5f, 2.5f, 3f, 2.5f, 2.5f))
            }

        val headers =
            listOf(
                "库存名称", "类型", "状态", "当前数量", "可用数量", "单价(元)",
                "收货时间", "供应商", "序列号", "批次号", "存储点",
            )

        // 检查表头与表格列数是否匹配
        check(headers.size == table.numberOfColumns) {
            "列数不匹配：headers.size=${headers.size} vs table.columns=${table.numberOfColumns}"
        }

        // 添加表头
        headers.forEach { header ->
            table.addCell(Phrase(header, font))
        }

        // 添加表格数据
        for (unit in units) {
            table.addCell(Phrase(unit.title, font))
            table.addCell(Phrase(mapInventoryUnitTypeToChinese(unit.type), font))
            table.addCell(Phrase(mapInventoryUnitStatusToChinese(unit.status), font))
            table.addCell(Phrase(unit.quantity.toString(), font))
            table.addCell(Phrase(unit.remainingQuantity.toString(), font))
            table.addCell(Phrase(unit.unitPrice.toPlainString(), font))
            table.addCell(Phrase(formatter.format(unit.receivedAt), font))
            table.addCell(Phrase(unit.supplierName, font))
            table.addCell(Phrase(unit.serialNumber ?: "-", font))
            table.addCell(Phrase(unit.batchCode?.toString() ?: "-", font))
            table.addCell(Phrase(unit.depotName ?: "-", font))
        }

        document.add(table)
        document.close()
        return outputStream.toByteArray()
    }

    private fun mapInventoryUnitStatusToChinese(input: String): String {
        return when (input.uppercase()) {
            "NORMAL" -> "正常"
            "CONSUMED" -> "已消耗"
            "CANCELED" -> "已作废"
            "REVERSED" -> "已撤销"
            else -> "未知"
        }
    }

    private fun mapInventoryUnitTypeToChinese(input: String): String {
        return when (input.uppercase()) {
            "INSTANCE" -> "资产"
            "BATCH" -> "普通商品"
            else -> "未知"
        }
    }

    companion object {
        val formatter =
            DateTimeFormatter.ofPattern("yyyy年MM月dd日 HH:mm:ss")
                .withZone(ZoneId.of("Asia/Shanghai"))
    }
}
