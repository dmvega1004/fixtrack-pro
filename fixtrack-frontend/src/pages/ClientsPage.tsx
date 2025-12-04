// src/pages/ClientsPage.tsx  ← VERSIÓN FINAL DEFINITIVA (10/10 + bonus)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Client, clientsService } from "@/services/clients.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, UserPlus, Loader2, Edit, Trash2 } from "lucide-react"
import { ClientDialog } from "@/components/clientes/ClientDialog"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"

export default function ClientsPage() {
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: clientsService.getClients,
  })

  const deleteMutation = useMutation({
    mutationFn: clientsService.deleteClient,
    onMutate: async (id: number) => {
      setDeletingId(id)
    },
    onSuccess: () => {
      toast({ title: "Cliente eliminado correctamente" })
      queryClient.invalidateQueries({ queryKey: ["clients"] })
    },
    onError: () => {
      toast({ title: "Error al eliminar cliente", variant: "destructive" })
    },
    onSettled: () => {
      setDeletingId(null)
    },
  })

  const handleEdit = (client: Client) => {
    setSelectedClient(client)
    setOpenDialog(true)
  }

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.")) {
      deleteMutation.mutate(id)
    }
  }

  const handleSuccess = () => {
    setOpenDialog(false)
    setSelectedClient(null)
    queryClient.invalidateQueries({ queryKey: ["clients"] })
  }

  const handleNewClient = () => {
    setSelectedClient(null)
    setOpenDialog(true)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <CardTitle className="text-3xl font-bold">Gestión de Clientes</CardTitle>
          <Button onClick={handleNewClient} size="lg" className="gap-2">
            <UserPlus className="w-5 h-5" />
            Nuevo Cliente
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">No hay clientes registrados aún</p>
              <Button onClick={handleNewClient} className="mt-6" size="lg">
                Crear primer cliente
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Nombre</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Teléfono</TableHead>
                    <TableHead className="font-semibold">Dirección</TableHead>
                    <TableHead className="text-right font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{client.nombre}</TableCell>
                      <TableCell>{client.email || "-"}</TableCell>
                      <TableCell>{client.telefono || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{client.direccion || "-"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={deletingId === client.id}
                            >
                              {deletingId === client.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                              <span className="sr-only">Abrir menú</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleEdit(client)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleDelete(client.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        client={selectedClient}
        onSuccess={handleSuccess}
      />
    </div>
  )
}