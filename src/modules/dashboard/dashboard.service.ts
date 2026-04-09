import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DashboardQueryDto, DashboardTimeRange } from './dtos/dashboard-query.dto';
import { Inventory, Order, Product, User } from 'src/entities';
import { Repository } from 'typeorm';

type DateRange = {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Inventory) private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
  ) {}

  async getOverview(query: DashboardQueryDto) {
    const timeRange = query.timeRange ?? DashboardTimeRange.SEVEN_DAYS;
    const threshold = 10;

    const range = this.getDateRange(timeRange);

    const currentOrders = await this.getOrdersByRange(range.currentStart, range.currentEnd);
    const previousOrders = await this.getOrdersByRange(range.previousStart, range.previousEnd);

    const currentRevenue = this.sumRevenue(currentOrders);
    const previousRevenue = this.sumRevenue(previousOrders);

    const currentUsers = await this.countUsersByRange(range.currentStart, range.currentEnd);
    const previousUsers = await this.countUsersByRange(range.previousStart, range.previousEnd);

    const lowStockCount = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .where('inventory.quantity <= :threshold', { threshold })
      .getCount();

    const lowStockItems = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .select(['inventory.variantId AS "variantId"', 'inventory.quantity AS quantity'])
      .where('inventory.quantity <= :threshold', { threshold })
      .orderBy('inventory.quantity', 'ASC')
      .limit(3)
      .getRawMany<{ variantId: number; quantity: number }>();

    const revenueSeries = this.buildRevenueSeries(currentOrders, timeRange);
    const orderStatusSeries = this.buildOrderStatusSeries(currentOrders);
    const categoryShare = await this.getCategoryShare();

    const recentOrders = [...currentOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);

    const recentUsers = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id AS id', 'user.email AS email', 'user.createdAt AS "createdAt"'])
      .where('user.isActive = :isActive', { isActive: true })
      .orderBy('user.createdAt', 'DESC')
      .limit(2)
      .getRawMany<{ id: number; email: string; createdAt: Date }>();

    const recentActivities = [
      ...recentOrders.map((order) => ({
        type: 'order',
        title: `Đơn #${order.id}`,
        description: `${order.status} • ${this.formatCurrency(order.totalAmount)}`,
        time: order.createdAt,
      })),
      ...recentUsers.map((user) => ({
        type: 'user',
        title: 'Người dùng mới',
        description: user.email,
        time: user.createdAt,
      })),
      ...lowStockItems.map((item) => ({
        type: 'inventory',
        title: `Cảnh báo tồn kho biến thể #${item.variantId}`,
        description: `Còn ${item.quantity} sản phẩm`,
        time: new Date(),
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 6);

    return {
      filters: {
        timeRange,
      },
      metrics: {
        revenue: {
          value: currentRevenue,
          previousValue: previousRevenue,
          changePercent: this.calcPercentChange(currentRevenue, previousRevenue),
        },
        orders: {
          value: currentOrders.length,
          previousValue: previousOrders.length,
          changePercent: this.calcPercentChange(currentOrders.length, previousOrders.length),
        },
        newUsers: {
          value: currentUsers,
          previousValue: previousUsers,
          changePercent: this.calcPercentChange(currentUsers, previousUsers),
        },
        lowStock: {
          value: lowStockCount,
          threshold,
        },
      },
      charts: {
        revenueSeries,
        categoryShare,
        orderStatusSeries,
      },
      recentActivities,
      generatedAt: new Date().toISOString(),
    };
  }

  private getDateRange(timeRange: DashboardTimeRange): DateRange {
    const now = new Date();
    const currentEnd = new Date(now);
    const currentStart = new Date(now);

    let days = 7;
    if (timeRange === DashboardTimeRange.THIRTY_DAYS) days = 30;
    if (timeRange === DashboardTimeRange.QUARTER) days = 90;

    currentStart.setDate(currentStart.getDate() - (days - 1));
    currentStart.setHours(0, 0, 0, 0);

    const previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - days);

    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  private async getOrdersByRange(start: Date, end: Date) {
    return this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt BETWEEN :start AND :end', { start, end })
      .select(['order.id', 'order.totalAmount', 'order.status', 'order.createdAt'])
      .getMany();
  }

  private sumRevenue(orders: Array<Pick<Order, 'totalAmount'>>) {
    return orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  }

  private async countUsersByRange(start: Date, end: Date) {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getCount();
  }

  private buildRevenueSeries(
    orders: Array<Pick<Order, 'totalAmount' | 'createdAt'>>,
    timeRange: DashboardTimeRange,
  ) {
    if (timeRange === DashboardTimeRange.SEVEN_DAYS) {
      const now = new Date();
      const buckets = Array.from({ length: 7 }, (_, idx) => {
        const date = new Date(now);
        date.setDate(now.getDate() - (6 - idx));
        const key = date.toISOString().slice(0, 10);
        return {
          key,
          label: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
          revenue: 0,
        };
      });

      const indexByKey = new Map(buckets.map((bucket, index) => [bucket.key, index]));
      orders.forEach((order) => {
        const key = new Date(order.createdAt).toISOString().slice(0, 10);
        const index = indexByKey.get(key);
        if (index !== undefined) {
          buckets[index].revenue += Number(order.totalAmount || 0);
        }
      });

      return buckets.map(({ label, revenue }) => ({ label, revenue }));
    }

    if (timeRange === DashboardTimeRange.THIRTY_DAYS) {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);

      const buckets = [
        { label: 'Tuần 1', revenue: 0 },
        { label: 'Tuần 2', revenue: 0 },
        { label: 'Tuần 3', revenue: 0 },
        { label: 'Tuần 4', revenue: 0 },
      ];

      orders.forEach((order) => {
        const createdAt = new Date(order.createdAt);
        const diffDays = Math.floor((createdAt.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return;
        const index = Math.min(3, Math.floor(diffDays / 7));
        buckets[index].revenue += Number(order.totalAmount || 0);
      });

      return buckets;
    }

    const now = new Date();
    const buckets = [
      { label: 'Tháng -2', revenue: 0 },
      { label: 'Tháng -1', revenue: 0 },
      { label: 'Tháng này', revenue: 0 },
    ];

    orders.forEach((order) => {
      const createdAt = new Date(order.createdAt);
      const monthDiff =
        now.getMonth() - createdAt.getMonth() +
        (now.getFullYear() - createdAt.getFullYear()) * 12;

      if (monthDiff >= 0 && monthDiff <= 2) {
        const index = 2 - monthDiff;
        buckets[index].revenue += Number(order.totalAmount || 0);
      }
    });

    return buckets;
  }

  private buildOrderStatusSeries(orders: Array<Pick<Order, 'status'>>) {
    const labels: Record<string, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      processing: 'Đang xử lý',
      shipped: 'Đang giao',
      delivered: 'Đã giao',
      canceled: 'Đã hủy',
      return_requested: 'Yêu cầu trả hàng',
      returned: 'Đã trả',
      refunded: 'Đã hoàn tiền',
    };

    const total = Math.max(orders.length, 1);
    const grouped = orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([status, count]) => ({
        status,
        label: labels[status] ?? status,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async getCategoryShare() {
    const rows = await this.productRepository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .select('COALESCE(category.name, :fallback)', 'label')
      .addSelect('COUNT(product.id)', 'count')
      .where('product.isActive = :isActive', { isActive: true, fallback: 'Khác' })
      .groupBy('category.name')
      .orderBy('COUNT(product.id)', 'DESC')
      .limit(6)
      .getRawMany<{ label: string; count: string }>();

    const total = rows.reduce((sum, row) => sum + Number(row.count), 0) || 1;
    return rows.map((row) => ({
      label: row.label,
      value: Math.round((Number(row.count) / total) * 100),
    }));
  }

  private calcPercentChange(current: number, previous: number) {
    if (!previous && !current) return 0;
    if (!previous) return 100;
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }
}
