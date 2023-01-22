import { FastifyInstance } from 'fastify';
import { prisma } from './lib/prisma';
import { z } from 'zod';
import dayjs from 'dayjs';

export async function appRoutes(app: FastifyInstance){
  
  app.post('/habits', async (req, res) => {
    
    const createHabitBody = z.object({
      title: z.string(),
      weekDays: z.array(
        z.number().min(0).max(6)
        )
    });

    const { title, weekDays } = createHabitBody.parse(req.body);

    const today = dayjs().startOf('day').toDate(); // 2023-01-10 00:00:00

    await prisma.habit.create({
      data: {
        title,
        created_at: today,
        weekDays: {
          create: weekDays.map(weekDay => {
            return {
              week_day: weekDay
            }
          })
        }
      }
    });
  });


  app.get('/day', async (req, res) => {

    const getDayParams = z.object({
      date: z.coerce.date()
    })

    // date - data atual;
    const { date } = getDayParams.parse(req.query);

    const parsedDate = dayjs(date).startOf('day');

    //dia da semana atual
    const weekDay = parsedDate.get('day');

    console.log(date, weekDay)

    const possibleHabits = await prisma.habit.findMany({
      where: {
        created_at: {
          lte: date
        },
        weekDays: {
          some: {
            week_day: weekDay
          }
        }
      }
    });
    //console.log(parsedDate.toDate());

    const day = await prisma.day.findFirst({
      where: {
        date: parsedDate.toDate(),
      },
      include: {
        dayHabits: true
      }
    })

    const completedHabits = day?.dayHabits.map(dayHabit => {
      return dayHabit.habit_id;
    }) ?? [];

    //console.log(day);
    return {
      possibleHabits,
      completedHabits
    }
  })

  app.patch('/habits/:id/toggle', async (req, res) => {
    //':id' route param => parametro identificacao

    const toggleHabitParams = z.object({
      id: z.string().uuid(),
    })

    const { id } = toggleHabitParams.parse(req.params);

    const today = dayjs().startOf('day').toDate();

    let day = await prisma.day.findUnique({
      where: {
        date: today,
      }
    });

    if(!day){
      day = await prisma.day.create({
        data: {
          date: today,
        }
      });
    }

    const dayHabit = await prisma.dayHabit.findUnique({
      where: {
        day_id_habit_id: {
          day_id: day.id,
          habit_id: id,
        }
      }
    }) // se registro marcado alredy exists

    if(dayHabit){
      // remove
      await prisma.dayHabit.delete({
        where: {
          id: dayHabit.id,
        }
      });
    }
    else{
      // completar habito
      await prisma.dayHabit.create({
        data: {
          day_id: day.id,
          habit_id: id,
        }
      });
    }

  })

  app.get('/summary', async (req, res) => {
    // [{dia especifico, quantos habitos possiveis completar, quantosconseguiu completar}, 
    //   {proximo dia, habitos posiveis, compltados}]
    // [{date: 17/01, amount: 5, completed: 1}, {date: 18/01, amount: 2, completed: 2}, {}]

    // ORM, Query Builder mas 
    // Query mais complexa, mais condicoes, rel => SQL na mao(RAW) -> RAW SQL - SQLite(nesse caso) 

    // SQLite date, Epoch Time stamp,  strftime -> format date
    // Query (Sub Query)
    const summary = await prisma.$queryRaw`
      SELECT 
        D.id, 
        D.date,
        (
          SELECT 
            cast(count(*) as float) 
          FROM day_habits DH
          WHERE DH.day_id = D.id
        ) as completed,
        (
          SELECT
            cast(count(*) as float)
          FROM habit_week_days HWD
          JOIN habits H
            ON H.id = HWD.habit_id
          WHERE
            HWD.week_day = cast(strftime('%w', D.date / 1000.0, 'unixepoch') as int)
            AND H.created_at <= D.date
        ) as amount
      FROM days D
    `
    return summary;
  });


}