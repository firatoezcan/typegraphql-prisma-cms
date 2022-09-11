import { AbilityBuilder, AbilityClass } from "@casl/ability";
import { PrismaAbility, Subjects } from "@casl/prisma";
import {
  Album,
  Artist,
  Customer,
  Employee,
  Genre,
  Invoice,
  InvoiceLine,
  MediaType,
  Playlist,
  PlaylistTrack,
  Track,
} from "@prisma/client";
import { Context } from "..";

export type AppAbility = PrismaAbility<
  [
    "read" | "create" | "insert",
    Subjects<{
      Album: Album;
      Artist: Artist;
      Customer: Customer;
      Employee: Employee;
      Genre: Genre;
      Invoice: Invoice;
      InvoiceLine: InvoiceLine;
      MediaType: MediaType;
      Playlist: Playlist;
      PlaylistTrack: PlaylistTrack;
      Track: Track;
    }>
  ]
>;

const AppAbility = PrismaAbility as AbilityClass<AppAbility>;

export const createUserReadAbility = async (context: Context) => {
  const { can, cannot, build } = new AbilityBuilder(AppAbility);

  const { CustomerId, EmployeeId, prisma } = context;
  can("read", "Album");
  can("read", "Artist");
  can("read", "Genre");
  can("read", "MediaType");
  can("read", "Playlist");
  can("read", "PlaylistTrack");
  can("read", "Track");
  if (!CustomerId && !EmployeeId) {
    // Todo: Public only
    return build();
  }

  if (EmployeeId) {
    const employee = await prisma.employee.findUnique({ where: { EmployeeId }, select: { EmployeeId: true } });
    if (!employee) {
      throw new Error(`Couldn't find employee with id "${EmployeeId}"`);
    }
    can("read", "Customer", { SupportRepId: { equals: EmployeeId } });
    can("read", "Invoice", { Customer: { is: { SupportRepId: { equals: EmployeeId } } } });
    can("read", "InvoiceLine", { Invoice: { is: { Customer: { is: { SupportRepId: { equals: EmployeeId } } } } } });
    can("read", "Employee", { ReportsTo: { equals: EmployeeId } });
    can("read", "Customer", { Employee: { is: { ReportsTo: { equals: EmployeeId } } } });
    can("read", "Invoice", { Customer: { is: { Employee: { is: { ReportsTo: { equals: EmployeeId } } } } } });
    can("read", "InvoiceLine", {
      Invoice: { is: { Customer: { is: { Employee: { is: { ReportsTo: { equals: EmployeeId } } } } } } },
    });
    return build();
  }

  if (CustomerId) {
    const customer = await prisma.customer.findUnique({ where: { CustomerId }, select: { CustomerId: true } });
    if (!customer) {
      throw new Error(`Couldn't find customer with id "${CustomerId}"`);
    }

    can("read", "Customer", { CustomerId: { equals: CustomerId } });
    can("read", "Invoice", { CustomerId: { equals: CustomerId } });
    can("read", "InvoiceLine", { Invoice: { is: { CustomerId: { equals: CustomerId } } } });
    can("read", "Employee", { Customer: { some: { CustomerId: { equals: CustomerId } } } });
    return build();
  }

  return build();
};

export const createUserModifyAbility = async (context: Context) => {
  const { can, cannot, build } = new AbilityBuilder(AppAbility);

  const { CustomerId, EmployeeId, prisma } = context;

  if (!CustomerId && !EmployeeId) {
    // Todo: Public only
    return build();
  }

  if (EmployeeId) {
    const employee = await prisma.employee.findUnique({ where: { EmployeeId }, select: { EmployeeId: true } });
    if (!employee) {
      throw new Error(`Couldn't find employee with id "${EmployeeId}"`);
    }

    return build();
  }

  if (CustomerId) {
    const customer = await prisma.customer.findUnique({ where: { CustomerId }, select: { CustomerId: true } });
    if (!customer) {
      throw new Error(`Couldn't find customer with id "${CustomerId}"`);
    }

    return build();
  }

  return build();
};
