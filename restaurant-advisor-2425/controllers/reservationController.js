const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Store = mongoose.model('Store');
const User = require('../models/User');

exports.setSchedule = async (req, res) => {
    // Obtener restaurante, días cerrados, franjas y capacidad desde el body
    const { storeId, closedDays, reservationSlots } = req.body;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ error: 'Restaurante no encontrado' });
    store.closedDays = closedDays;
    store.reservationSlots = reservationSlots;
    await store.save();
    res.json({ message: 'Horario configurado exitosamente' });
  };

exports.getAvailability = async (req, res) => {
    const { storeId, date } = req.query;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ error: 'Restaurante no encontrado' });
  
    const requestedDay = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }); // Ejemplo: "Monday"
  
    // Verificar si el día está cerrado
    if (store.closedDays.includes(requestedDay)) {
      return res.json({ available: false, message: 'Restaurante cerrado este día' });
    }
  
    // Obtener las franjas horarias para el día solicitado
    const daySlots = store.reservationSlots.find(slot => slot.day === requestedDay);
    if (!daySlots) {
      return res.json({ available: false, message: 'No hay franjas horarias disponibles este día' });
    }
  
    // Verificar disponibilidad de cada franja horaria
    const reservations = await Reservation.find({ store: storeId, date });
    const availability = daySlots.slots.map(slot => {
      const count = reservations.filter(
        r => r.timeSlot === `${slot.startTime}-${slot.endTime}`
      ).length;
      return {
        timeSlot: `${slot.startTime}-${slot.endTime}`,
        available: count < slot.maxReservations,
      };
    });
  
    res.json(availability);
};
  


exports.createReservation = async (req, res) => {
    try {
      // Verificar datos recibidos
      console.log('Datos recibidos:', req.body);
  
      // Asegurarse de que el usuario y la tienda existen
      const userId = req.user._id; // Verifica si req.user existe
      const storeId = req.params.id;
  
      // Validar que la tienda exista
      const store = await Store.findById(storeId);
      if (!store) {
        console.error('Tienda no encontrada');
        return res.status(404).json({ message: 'Store not found' });
      }
  
      // Dividir la franja horaria en startTime y endTime
      const [startTime, endTime] = req.body.timeSlot.split('-');
  
      // Crear la reserva
      const reservation = new Reservation({
        user: userId,
        store: storeId,
        date: new Date(req.body.date),
        startTime,
        endTime,
      });
  
      console.log('Reserva a guardar:', reservation);
  
      // Guardar en la base de datos
      const savedReservation = await reservation.save();
      console.log('Reserva guardada:', savedReservation);
  
      res.status(200).json({
        message: 'Reservation created successfully',
        reservation: savedReservation,
      });
    } catch (error) {
      console.error('Error al crear la reserva:', error);
      res.status(500).json({ message: 'An error occurred while creating the reservation' });
    }
  };
  

exports.getUserReservations = async (req, res) => {
    try {
      // Buscar reservas del usuario actual, ordenadas por fecha
      const reservations = await Reservation.find({ user: req.user._id })
        .populate('store') // Cargar información de la tienda asociada
        .sort({ date: 1 }); // Ordenar por fecha ascendente
  
      // Renderizar la vista con las reservas
      res.render('userReservations', { title: 'Your Reservations', reservations });
    } catch (error) {
      console.error('Error fetching user reservations:', error);
      req.flash('error', 'An error occurred while fetching your reservations.');
      res.redirect('back');
    }
  };
  

exports.cancelReservation = async (req, res) => {
    try {
        // Buscar la reserva por ID
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            req.flash('error', 'Reservation not found');
            return res.redirect('back');
        }

        // Buscar la tienda asociada a la reserva
        const store = await Store.findById(reservation.store);
        if (!store) {
            req.flash('error', 'Store not found');
            return res.redirect('back');
        }

        // Actualizar el estado de la reserva
        reservation.status = 'cancelled';
        await reservation.save();

        // Actualizar el `maxReservations` en el `reservationSlots` de la tienda
        const slot = store.reservationSlots.find(
            slot =>
                slot.day === reservation.date.toLocaleDateString('en-US', { weekday: 'long' }) &&
                slot.startTime === reservation.startTime &&
                slot.endTime === reservation.endTime
        );

        if (slot) {
            slot.maxReservations += 1; // Liberar un espacio en el slot
            await store.save();
        }

        req.flash('success', 'Reservation cancelled');
        res.redirect('back');
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        req.flash('error', 'An error occurred while cancelling the reservation');
        res.redirect('back');
    }
};

  
  